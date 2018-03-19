#!/usr/bin/python

import web
import runModel
# sys.path.append(os.path.abspath('/afs/cs.unc.edu/home/cubler/public_html/inputProcess/caffe/python'))
import myInputSetUp
from web.wsgiserver import CherryPyWSGIServer
import os
import time
import json
from urlparse import urlparse, parse_qs
from requests_toolbelt.multipart import decoder
import io
import shutil
import time
import base64
from PIL import Image
import re
import numpy as np 
from skimage import exposure
from skimage import io as imageIO 

urls = (
    '/', 'index',
    '/dataCollect', 'dataCollect',
    '/model', 'model',
    '/save', 'save',
    '/start', 'start',
    '/dataCollection', 'dataCollection',
    '/feedback', 'feedback',
    '/eyeTrainer', 'eyeTrainer',
    '/getCoordsFast', 'getCoordsFast',
    '/cancelDataCollect', 'cancelDataCollect',
)

CherryPyWSGIServer.ssl_certificate = "./ssl/myserver.crt"
CherryPyWSGIServer.ssl_private_key = "./ssl/myserver.key"

render = web.template.render('templetes/',)

app = web.application(urls, globals())
fileNumber = 0;
histogramEq = False
savePath = './myData/saveData/'


class index:
    def GET(self):
        return render.index(self)

class dataCollection:
    def GET(self):
        return render.dataCollection(self)

class feedback:
    def GET(self):
        return render.feedback(self)

class eyeTrainer:
    def GET(self):
        return render.eyeTrainer(self)

class start:
    def GET(self):
        ip = web.ctx['ip']
        subPath = 0;
        while checkForDir(savePath + ip + '/' + str(subPath)):
             subPath += 1

        return subPath

class dataCollect:
    def GET(self):

        startCaptureTime = time.time()
        url = web.input().imgBase64
        imgstr = re.search(r'base64,(.*)',url).group(1)
        imageBytes = io.BytesIO(base64.b64decode(imgstr))
        image = Image.open(imageBytes)
        imageArray = np.array(image)[:,:,:]

        [leftEyePic, rightEyePic, facePic, faceGrid] = myInputSetUp.setUpNoSave(imageArray, web.input().faceFeatures)
        modelStartTime = time.time()    
        output = runModel.runFast(leftEyePic, rightEyePic, facePic, faceGrid)
        modelDuration = time.time() - modelStartTime

        rawSubPath = 0
        subfolderPath = web.ctx['ip'] + '/' + web.input().saveFullSubPath
        currentPosition = float(web.input().currentPosition)
        features = json.loads(web.input().faceFeatures)
                # Saves 5 of the picture captures so they can be analysed later if need be
        while(checkForDir(savePath + subfolderPath + '/' + str(rawSubPath)) and (rawSubPath <= 5)):
            rawSubPath += 1
        if(rawSubPath < 5):
            file = open(savePath + subfolderPath + '/' + str(rawSubPath) +  '/faceFeatures.json','w+')
            file.write(web.input().faceFeatures)
            file.close() 
            imageIO.imsave(savePath + subfolderPath + '/' + str(rawSubPath) +  '/wholeFace.jpg' ,image)        
        
        file = open(savePath + subfolderPath + '/coordsList.txt','a+')
        saveData = {
            "currentPosition" : str(currentPosition),
            "coords" : output,
            "perimeterPercent" : web.input().perimeterPercent,
            "eyeMetric" : [features['leftEyeMetric'], features['rightEyeMetric']],
            "isRingLight" : web.input().isRingLight,
            "isFullScreen" : web.input().isFullScreen,
            "modelDuration" : modelDuration,
            "totalDuration" : time.time() - startCaptureTime,
            "aspectDim" : web.input().aspectDim,
            }
        file.write(json.dumps(saveData) + '\n')
        file.close()
		
        print("Model Time: %.3f" % (modelDuration))

		# Delete data subfolder
        print("Total Capture Time: %.2f" % (time.time() - startCaptureTime))
        return output

class cancelDataCollect:
    def GET(self):
        subfolderPath = web.ctx['ip'] + '/' + web.input().saveFullSubPath
        shutil.rmtree(savePath + subfolderPath)
        os.removedirs(savePath + web.ctx['ip'] + '/' + web.input().saveSubPath)
#        file = open(savePath + subfolderPath + '/canceled.txt','w')
#        file.write("Canceled")
#        file.close()

        

class getCoordsFast:
    def GET(self):
    
        startCaptureTime = time.time()
        url = web.input().imgBase64
        imgstr = re.search(r'base64,(.*)',url).group(1)
        imageBytes = io.BytesIO(base64.b64decode(imgstr))
        image = Image.open(imageBytes)
        imageArray = np.array(image)[:,:,:]

        [leftEyePic, rightEyePic, facePic, faceGrid] = myInputSetUp.setUpNoSave(imageArray, web.input().faceFeatures)

        global histogramEq        
        if(histogramEq):
            leftEyePic = exposure.equalize_hist(leftEyePic)
            rightEyePic = exposure.equalize_hist(rightEyePic)
            facePic = exposure.equalize_hist(facePic)
            
        output = runModel.runFast(leftEyePic, rightEyePic, facePic, faceGrid)

#        imageIO.imsave('facePic.jpg',facePic)        

		# Delete data subfolder
        print("Total Fast Capture Time: %.2f" % (time.time() - startCaptureTime))
        return output


class model:
    def GET(self):
        web.header('Access-Control-Allow-Origin', '*')
        web.header('Access-Control-Allow-Credentials', 'true')
        setup = myInputSetUp.setUp()
        output = runModel.run()
        #image = open('./myData/face/0.jpg','rb').read()
        return output

class save:
    def GET(self):
        savePath = './myData/saveData/'
        saveSubPath = 0
        img = web.input().imgBase64
        encode = img[23:len(img)].decode('base64')
        
#        checkForDir(savePath + str(saveSubPath))
    
        while checkForDir(savePath + str(saveSubPath)):
            saveSubPath = saveSubPath + 1
		
        fp = open(savePath + str(saveSubPath) + '/wholeFace.jpg', 'wb')
        fp.write(encode)
        fp.close 

        file = open(savePath + str(saveSubPath) + '/coordsList.json','w+')
        file.write(web.input().coordsData)
        file.close()

def checkForDir(path):
    if(not os.path.exists(path)):
        try:
            os.makedirs(path)
            return False
        except Exception as e:
            print(e.message)
            return False
    else:
        return True



if __name__ == "__main__":
    app = web.application(urls, globals())
    app.run()
 

