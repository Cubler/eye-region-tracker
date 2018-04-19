import os
import sys
# sys.path.append(os.path.abspath('/afs/cs.unc.edu/home/cubler/public_html/inputProcess/caffe/python'))
sys.path.append(os.path.abspath("/home/cubler/caffe/python"))
#print(sys.path)
os.environ['GLOG_minloglevel']='2'
import caffe
import json
import numpy as np
from PIL import Image
import time
from scipy.ndimage import zoom


def run(subfolderPath):
    caffe.set_mode_gpu()

    runStartTime = time.time()
    dataPath="./myData/"+subfolderPath
    modelsPath='./models'

    outputFile = open(dataPath+'/output.txt','w+')
    out=[]
    net = caffe.Net(modelsPath+"/itracker_deploy.prototxt",
    modelsPath + "/snapshots/itracker25x_iter_92000.caffemodel",
    caffe.TEST)
    
    jpgNames = os.listdir(dataPath+'/leftEye')
    jpgNames.sort()

    faceGridData= json.load(open(dataPath+'/face/faceGridData.json'))
    i = 0
    for jpgName in jpgNames:

        try:
            imFace = np.array(Image.open(dataPath+'/face/'+jpgName))
            imLeft = np.array(Image.open(dataPath+'/leftEye/' + jpgName))
            imRight= np.array(Image.open(dataPath+'/rightEye/' + jpgName))
        except:
            print('error when loading image data ' + jpgName)
            continue


     
        transformer = caffe.io.Transformer({
            'image_left': net.blobs['image_left'].data.shape,
            'image_right': net.blobs['image_right'].data.shape,
            'image_face': net.blobs['image_face'].data.shape,
            'facegrid': net.blobs['facegrid'].data.shape})

        #load and set mean images for left, right and face input
        
        blob= caffe.proto.caffe_pb2.BlobProto()
        data= open(modelsPath+'/mean_images/mean_left_224.binaryproto','rb').read()
        blob.ParseFromString(data)
        mean_arr= caffe.io.blobproto_to_array(blob)
        transformer.set_mean('image_left', mean_arr[0])

        blob= caffe.proto.caffe_pb2.BlobProto()
        data= open(modelsPath+'/mean_images/mean_right_224.binaryproto','rb').read()
        blob.ParseFromString(data)
        mean_arr= caffe.io.blobproto_to_array(blob)
        transformer.set_mean('image_right', mean_arr[0])

        blob= caffe.proto.caffe_pb2.BlobProto()
        data= open(modelsPath+'/mean_images/mean_face_224.binaryproto','rb').read()
        blob.ParseFromString(data)
        mean_arr= caffe.io.blobproto_to_array(blob)
        transformer.set_mean('image_face', mean_arr[0])
        
        '''
        transformer.set_raw_scale('image_left', 255.0)
        transformer.set_raw_scale('image_right', 255.0)
        transformer.set_raw_scale('image_face', 255.0)
        '''

        #Reshape input for batchsize of 1
        net.blobs['image_left'].reshape(1,3,224,224)
        net.blobs['image_right'].reshape(1,3,224,224)
        net.blobs['image_face'].reshape(1,3,224,224)
        net.blobs['facegrid'].reshape(1,625,1,1)

        transformer.set_transpose('image_left', (2,0,1))
        transformer.set_transpose('image_right', (2,0,1))
        transformer.set_transpose('image_face', (2,0,1))
#        transformer.set_transpose('facegrid', (2,0,1))

        if(len(jpgNames) != 1):
            faceGridInput = faceGridData[i]
            i += 1
        else:
            faceGridInput = faceGridData
        '''
        imLeft = resizeImage(imLeft,[224,224])
        imRight = resizeImage(imRight,[224,224])
        imFace = resizeImage(imFace,[224,224])
        '''
        #Load images into input layer
        net.blobs['image_left'].data[...]= transformer.preprocess('image_left',imLeft)
        net.blobs['image_right'].data[...]= transformer.preprocess('image_right',imRight)
        net.blobs['image_face'].data[...]= transformer.preprocess('image_face',imFace)
        net.blobs['facegrid'].data[...]= transformer.preprocess('facegrid',np.reshape(np.array(faceGridInput),(625,1,1)))
        s=time.time()

        print('Processing...')
        out= net.forward()
        print("%0.2f, %0.2f" % (out['fc3'][0][0], out['fc3'][0][1]))
        print("Model Running Duration: %0.2f" % (time.time() - s))
        print("Whole Running Duration: %0.2f" % (time.time() - runStartTime))
        outputFile.write("[%0.2f, %0.2f]\n" % (out['fc3'][0][0], out['fc3'][0][1]))
    outputFile.close()
    return("%0.2f, %0.2f" % (out['fc3'][0][0], out['fc3'][0][1]))


def runFast(leftEyePic, rightEyePic, facePic, faceGrid):
    modelsPath='./models'

    runStartTime = time.time()
    caffe.set_mode_gpu()

    out=[]
    
    faceGridData= faceGrid
    imFace = facePic
    imLeft = leftEyePic
    imRight = rightEyePic


    #Load images into input layer
    net.blobs['image_left'].data[...]= transformer.preprocess('image_left',imLeft)
    net.blobs['image_right'].data[...]= transformer.preprocess('image_right',imRight)
    net.blobs['image_face'].data[...]= transformer.preprocess('image_face',imFace)
    net.blobs['facegrid'].data[...]= transformer.preprocess('facegrid',np.reshape(np.array(faceGridData),(625,1,1)))
    s=time.time()
    out= net.forward()
    print("%0.2f, %0.2f" % (out['fc3'][0][0], out['fc3'][0][1]))
    print("Model Running Duration: %0.2f" % (time.time() - s))
    print("Whole Running Duration: %0.2f" % (time.time() - runStartTime))
    return("%0.2f, %0.2f" % (out['fc3'][0][0], out['fc3'][0][1]))

def setUpTransformer():
    modelsPath='./models'
    caffe.set_mode_gpu()

    transformer = caffe.io.Transformer({
        'image_left': net.blobs['image_left'].data.shape,
        'image_right': net.blobs['image_right'].data.shape,
        'image_face': net.blobs['image_face'].data.shape,
        'facegrid': net.blobs['facegrid'].data.shape})

    #load and set mean images for left, right and face input
     
    blob= caffe.proto.caffe_pb2.BlobProto()
    data= open(modelsPath+'/mean_images/mean_left_224.binaryproto','rb').read()
    blob.ParseFromString(data)
    mean_arr= caffe.io.blobproto_to_array(blob)
    transformer.set_mean('image_left', mean_arr[0])

    blob= caffe.proto.caffe_pb2.BlobProto()
    data= open(modelsPath+'/mean_images/mean_right_224.binaryproto','rb').read()
    blob.ParseFromString(data)
    mean_arr= caffe.io.blobproto_to_array(blob)
    transformer.set_mean('image_right', mean_arr[0])

    blob= caffe.proto.caffe_pb2.BlobProto()
    data= open(modelsPath+'/mean_images/mean_face_224.binaryproto','rb').read()
    blob.ParseFromString(data)
    mean_arr= caffe.io.blobproto_to_array(blob)
    transformer.set_mean('image_face', mean_arr[0])
        
#    transformer.set_raw_scale('image_left', 255.0)
#    transformer.set_raw_scale('image_right', 255.0)
#    transformer.set_raw_scale('image_face', 255.0)
    

    #Reshape input for batchsize of 1
    net.blobs['image_left'].reshape(1,3,224,224)
    net.blobs['image_right'].reshape(1,3,224,224)
    net.blobs['image_face'].reshape(1,3,224,224)
    net.blobs['facegrid'].reshape(1,625,1,1)

    transformer.set_transpose('image_left', (2,0,1))
    transformer.set_transpose('image_right', (2,0,1))
    transformer.set_transpose('image_face', (2,0,1))

    return transformer

def resizeImage(im, new_dims):
    scale = tuple(np.array(new_dims, dtype=float) / np.array(im.shape[:2]))
    resized_im = zoom(im, scale + (1,), order=1)
    return resized_im.astype(np.float32)


modelsPath='./models'
net = caffe.Net(modelsPath+"/itracker_deploy.prototxt",
modelsPath + "/snapshots/itracker25x_iter_92000.caffemodel",
caffe.TEST)

transformer = setUpTransformer()

