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
    '/model', 'model'
)

CherryPyWSGIServer.ssl_certificate = "./ssl/myserver.crt"
CherryPyWSGIServer.ssl_private_key = "./ssl/myserver.key"

render = web.template.render('templetes/',)

app = web.application(urls, globals())
fileNumber = 0;

class index:
    def GET(self):
        return render.index(self)

class capture:
    def GET(self):

        img = web.input().imgBase64
        print(img[23:50])
        encode = img[23:len(img)].decode('base64')

        global fileNumber
        subfolderPath = str(fileNumber)
        fileNumber = fileNumber + 1 
        checkForDir('./myData/rawData/' + subfolderPath)

        fp = open('./myData/rawData/' + subfolderPath + '/wholeFace.jpg','wb')
        fp.write(encode)
        fp.close()
    
        file = open('./myData/rawData/' + subfolderPath + '/faceFeatures.json','w+')
        file.write(web.input().faceFeatures)
        file.close() 
       
        featuresJson = json.dumps(web.input().faceFeatures)
#        if(featuresJson is not None):
#            file = open('./myData/rawData/' + subfolderPath + '/faceFeatures.json','w+')
#            file.write(web.input().faceFeatures)
#            file.close()
#        else:
#            print('Features are not a valid JSON.')
		
        setup = myInputSetUp.setUp(subfolderPath)
        output = runModel.run(subfolderPath)
		
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

def checkForDir(path):
    if(not os.path.exists(path)):
        try:
            os.makedirs(path)
        except Exception as e:
            print(e.message)

if __name__ == "__main__":
    app = web.application(urls, globals())
    app.run()
 

