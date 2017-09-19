import numpy as np
import json
import os
from scipy import ndimage
from scipy import misc
import PIL
dataPath = "/home/cubler/Downloads"
maxsize = (224,224)

def main():
	# for numOfPics: since we are ignoring photo (0) we get +1 num of photos we are going to prcess and therefore this works for range(start,<) 
	numOfPics = len(os.listdir('/home/cubler/Downloads'))/2 
	numOfPicsProcessed = len(os.listdir('/home/cubler/workspace/RA/workspace/myData/face'))/2
	numOfPicsProcessed = numOfPicsProcessed if numOfPicsProcessed != 0 else 1
	for i in range(numOfPicsProcessed,numOfPics):
		wholeFace = misc.imread(dataPath+"/wholeFace ("+str(i)+").jpg")
		f = open(dataPath+"/faceFeatures ("+str(i)+").json")
		features = json.load(f)

		leftEyeBox = np.round(features['leftEye']).astype(int)
		rightEyeBox = np.round(features['rightEye']).astype(int)
		faceBox = np.round(features['face']).astype(int)
		faceGridPoints = features['faceGridPoints']

		# Crop Whole Image and save
		misc.imsave('./myData/leftEye/' + str(i)+'.jpg', cropWithParams(wholeFace,leftEyeBox))
		misc.imsave('./myData/rightEye/' + str(i)+'.jpg', cropWithParams(wholeFace,rightEyeBox))
		misc.imsave('./myData/face/' + str(i)+'.jpg', cropWithParams(wholeFace,faceBox))

		createFaceGrid(wholeFace,faceBox,faceGridPoints,i)

	os.system("scp -r myData cubler@comp158.cs.unc.edu:/playpen/cubler/RA")

# formated as x,y,w,h where x,y is top left corner of box
def cropWithParams(image,box):
	[x,y,w,h]=box;
	return image[y:(y+h),x:(x+w),:]
	
	
# Creates the flat grid map from faceBox and face feature points
def createFaceGrid(wholeFace, faceBox, fgpts,fileNum):
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
	misc.imsave('faceGridPic.png', faceGrid)
	f = open('./myData/face/faceGridData' + str(fileNum) +'.txt','w')
	faceGridParams = misc.imresize(faceGrid,(25,25)).flatten()
	for i in range(0,len(faceGridParams)):
		if(faceGridParams[i]!=0):
			faceGridParams[i]=1
	json.dump(faceGridParams.tolist(),f)

main()



 