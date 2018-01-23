
import cgitb
import numpy as np
import json
import os
import sys
from scipy import ndimage
from scipy import misc
import PIL

maxsize = (224,224)

def setUp(subfolderPath):
	# for numOfPics: since we are ignoring photo (0) we get +1 num of photos we are going to prcess and therefore this works for range(start,<) 

	home = os.path.expanduser("~")
	dir_path = os.path.dirname(os.path.realpath(__file__))
	dataPath = "./myData/rawData" + '/' + subfolderPath
	savePath = './myData/' + subfolderPath

	checkForDir(savePath + '/leftEye')
	checkForDir(savePath + '/rightEye')
	checkForDir(savePath + '/face')

	wholeFace = misc.imread(dataPath+"/wholeFace.jpg")
	f = open(dataPath+"/faceFeatures.json")
	features = json.load(f)

	leftEyeBox = np.round(features['leftEye']).astype(int)
	rightEyeBox = np.round(features['rightEye']).astype(int)
	faceBox = np.round(features['face']).astype(int)
	faceGridPoints = features['faceGridPoints']

	# Crop Whole Image and save

	misc.imsave(savePath + '/leftEye/0.jpg', cropWithParams(wholeFace,leftEyeBox))
	misc.imsave(savePath + '/rightEye/0.jpg', cropWithParams(wholeFace,rightEyeBox))
	misc.imsave(savePath + '/face/0.jpg', cropWithParams(wholeFace,faceBox))

	faceGridParams = createFaceGridFromFaceBox(wholeFace,faceBox,faceGridPoints)

	f = open(savePath + '/face/faceGridData.json','w')
	json.dump(faceGridParams.tolist(),f)

def setUpNoSave(wholeFace, featureString):
	# for numOfPics: since we are ignoring photo (0) we get +1 num of photos we are going to prcess and therefore this works for range(start,<) 
    features = json.loads(featureString)
    leftEyeBox = np.round(features['leftEye']).astype(int)
    rightEyeBox = np.round(features['rightEye']).astype(int)
    faceBox = np.round(features['face']).astype(int)
    faceGridPoints = features['faceGridPoints']

    print(wholeFace.shape)
	# Crop Whole Image and save
    
    leftEyePic = cropWithParams(wholeFace,leftEyeBox)
    rightEyePic = cropWithParams(wholeFace,rightEyeBox)
    wholeFacePic = cropWithParams(wholeFace,faceBox)
    faceGridParams = createFaceGridFromFaceBox(wholeFace,faceBox,faceGridPoints)

    return leftEyePic, rightEyePic, wholeFacePic, faceGridParams.tolist()

# formated as x,y,w,h where x,y is top left corner of box
def cropWithParams(image,box):
    [x,y,w,h]=box;
    if y+h >= image.shape[0]:
        yend = image.shape[0]-1
    else:
        yend = y+h
    if x+w >= image.shape[1]:
        xend = image.shape[1]-1
    else:
        xend = x+w
    return image[y:yend,x:xend,:]
	
def checkForDir(path):
	if not os.path.exists(path):
		try:
			os.makedirs(path)
		except Exception as e:
			print(e.message)	

# Creates the flat grid map from faceBox and face feature points
def createFaceGridFromFeatures(wholeFace, faceBox, fgpts):
	faceImage = cropWithParams(wholeFace,faceBox)
	for pt in fgpts:
		pt[0] -= faceBox[0]
		pt[1] -= faceBox[1]
	faceGrid = np.ones([faceImage.shape[0],faceImage.shape[1]])
	lineY = lambda x,m,x1,y1: m*(x-x1)+y1;

	for y in range(0,faceGrid.shape[0]):
		for x in range(0,faceGrid.shape[1]):
			valid = False
			for i in range(0,8-1):
				m = (fgpts[i][1]-fgpts[i+1][1])/(fgpts[i][0]-fgpts[i+1][0]+1)
				# print(str(y) + ", " + str(x) + ", " + str(lineY(x,m,fgpts[i][0],fgpts[i][1])))
				y2 = lineY(x,m,fgpts[i][0],fgpts[i][1]);
				if(y2>0 and y>y2):
					faceGrid[y][x]=0
	#misc.imsave('faceGridPic.jpg', faceGrid)
	faceGridParams = misc.imresize(faceGrid,(25,25)).flatten()
	for i in range(0,len(faceGridParams)):
		if(faceGridParams[i]!=0):
			faceGridParams[i]=1
	return faceGridParams;

def createFaceGridFromFaceBox(wholeFace, faceBox, fgpts):
	[fx,fy,fw,fh]=faceBox;
	faceGrid = np.zeros((wholeFace.shape[0],wholeFace.shape[1]));
	for y in range(0,faceGrid.shape[0]):
		for x in range(0,faceGrid.shape[1]):
			if(x >= fx and x <= (fx+fw) and y >= fy and y <= (fy+fh)):
				faceGrid[y][x]=1;
	#misc.imsave('faceGridPic.jpg', faceGrid)
	faceGridParams = misc.imresize(faceGrid,(25,25)).flatten()
	for i in range(0,len(faceGridParams)):
		if(faceGridParams[i]!=0):
			faceGridParams[i]=1
	return faceGridParams





 
