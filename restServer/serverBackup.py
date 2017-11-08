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

urls = (
    '/', 'index',
    '/capture', 'capture',
    '/model', 'model'
)

CherryPyWSGIServer.ssl_certificate = "./ssl/myserver.crt"
CherryPyWSGIServer.ssl_private_key = "./ssl/myserver.key"

render = web.template.render('templetes/',)

app = web.application(urls, globals())


class index:
    def GET(self):
        return render.index(self)

class capture:
    def GET(self):

        img = web.input().imgBase64
        print(img[23:50])
        encode = img[23:len(img)].decode('base64')
        fp = open('./myData/rawData/wholeFace.jpg','wb')
        fp.write(encode)
        fp.close()
    
        file = open('./myData/rawData/faceFeatures.json','w+')
        file.write(web.input().faceFeatures)
        file.close() 
       
        featuresJson = json.dumps(web.input().faceFeatures)
        if(featuresJson is None):
            file = open('./myData/rawData/faceFeatures.json','w+')
            file.write(web.input().faceFeatures)
            file.close()
        else:
            print('Features are not a valid JSON.')

class model:
    def GET(self):
        web.header('Access-Control-Allow-Origin', '*')
        web.header('Access-Control-Allow-Credentials', 'true')
        setup = myInputSetUp.setUp()
        output = runModel.run()
        #image = open('./myData/face/0.jpg','rb').read()
        return output

if __name__ == "__main__":
    app = web.application(urls, globals())
    app.run()

