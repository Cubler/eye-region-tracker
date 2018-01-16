#!/usr/bin/python

import web
import runModel
# sys.path.append(os.path.abspath('/afs/cs.unc.edu/home/cubler/public_html/inputProcess/caffe/python'))
import myInputSetUp
from web.wsgiserver import CherryPyWSGIServer
import os
import json
from urlparse import urlparse, parse_qs
from requests_toolbelt.multipart import decoder
import os
import shutil


urls = (
    '/', 'index',
    '/capture', 'capture',
    '/model', 'model',
    '/save', 'save',
	'/start', 'start'
)

CherryPyWSGIServer.ssl_certificate = "./ssl/myserver.crt"
CherryPyWSGIServer.ssl_private_key = "./ssl/myserver.key"

render = web.template.render('templetes/',)

app = web.application(urls, globals())
fileNumber = 0;
savePath = './myData/saveData/'


class index:
    def GET(self):
        return render.index(self)

class start:
    def GET(self):
        global savePath
        ip = web.ctx['ip']
        subPath = 0;
        while checkForDir(savePath + ip + '/' + str(subPath)):
            subPath += 1
        return subPath

class capture:
    def GET(self):
        global savePath
        rawPath = './myData/rawData/'
        img = web.input().imgBase64
        encode = img[23:len(img)].decode('base64')
		
        rawSubPath = 0
        while checkForDir(rawPath + str(rawSubPath)):
            rawSubPath += 1
        
        subfolderPath = str(rawSubPath)
        checkForDir('./myData/rawData/' + subfolderPath)

        fp = open('./myData/rawData/' + subfolderPath + '/wholeFace.jpg','wb')
        fp.write(encode)
        fp.close()
    
        file = open('./myData/rawData/' + subfolderPath + '/faceFeatures.json','w+')
        file.write(web.input().faceFeatures)
        file.close() 
       
        setup = myInputSetUp.setUp(subfolderPath)
        output = runModel.run(subfolderPath)

        saveSubPath = int(web.input().saveSubPath)
        currentPosition = int(web.input().currentPosition)
        file = open(savePath + web.ctx['ip'] +'/' + str(saveSubPath) + '/coordsList.txt','a+')
        file.write(str(currentPosition)+ ', ' + output+'\n')
        file.close()
		
        fp = open(savePath + web.ctx['ip'] + '/' + str(saveSubPath) + '/wholeFace.jpg','wb')
        fp.write(encode)
        fp.close()

		# Delete data subfolder
        shutil.rmtree('./myData/rawData/'+subfolderPath)
        shutil.rmtree('./myData/' + subfolderPath)
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
 

