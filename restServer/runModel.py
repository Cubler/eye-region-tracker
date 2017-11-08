import os
import sys
# sys.path.append(os.path.abspath('/afs/cs.unc.edu/home/cubler/public_html/inputProcess/caffe/python'))
sys.path.append(os.path.abspath("/playpen/cubler/caffe/python"))
#print(sys.path)
import caffe
import json
import numpy as np
from PIL import Image

def run(subfolderPath):
    caffe.set_mode_cpu()

    dataPath="./myData/"+subfolderPath
    modelsPath='./models'

    out=[]
    net = caffe.Net(modelsPath+"/itracker_deploy.prototxt",
    modelsPath + "/snapshots/itracker_iter_92000.caffemodel",
    caffe.TEST)

    try:
        imFace = np.array(Image.open(dataPath+'/face/0.jpg'))
        imLeft = np.array(Image.open(dataPath+'/leftEye/0.jpg'))
        imRight= np.array(Image.open(dataPath+'/rightEye/0.jpg'))
    except:
        print('error when loading image data')

    faceGridData= json.load(open(dataPath+'/face/faceGridData.txt'))
     
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

    transformer.set_raw_scale('image_left', 255.0)
    transformer.set_raw_scale('image_right', 255.0)
    transformer.set_raw_scale('image_face', 255.0)

    #Reshape input for batchsize of 1
    net.blobs['image_left'].reshape(1,3,224,224)
    net.blobs['image_right'].reshape(1,3,224,224)
    net.blobs['image_face'].reshape(1,3,224,224)
    net.blobs['facegrid'].reshape(1,625,1,1)

    transformer.set_transpose('image_left', (2,0,1))
    transformer.set_transpose('image_right', (2,0,1))
    transformer.set_transpose('image_face', (2,0,1))

    #Load images into input layer
    net.blobs['image_left'].data[...]= transformer.preprocess('image_left',imLeft)
    net.blobs['image_right'].data[...]= transformer.preprocess('image_right',imRight)
    net.blobs['image_face'].data[...]= transformer.preprocess('image_face',imFace)
    net.blobs['facegrid'].data[...]= transformer.preprocess('facegrid',np.reshape(np.array(faceGridData),(625,1,1)))

    print('Processing...')
    out= net.forward()
    print("%0.2f, %0.2f" % (out['fc3'][0][0], out['fc3'][0][1]))
    return("%0.2f, %0.2f" % (out['fc3'][0][0], out['fc3'][0][1]))


