import numpy as np
import matplotlib.pyplot as plt
from matplotlib import cm
from matplotlib import colors
import math
import matplotlib.patches as mpatches
import sys
import json
import os

from mpl_toolkits.mplot3d import Axes3D

removeZerothPts = True
circleData = []
dataFileName = "coordsList.txt"
reportFileName = "coordReport.txt"


def main(path, averagepoints = False, centerwithpoints = True ):
    # path = "CircleData"
    # if(len(sys.argv)!=1):
    #     path = sys.argv[1]


	# Load and prepare all the data
    (points, xNumpy, yNumpy, perimeterPercentNumpy, \
    	eyeMetricNumpy, isRingLightNumpy) = readData(path);
    xCentered = centerData(xNumpy)
    yCentered = centerData(yNumpy)

    if(averagepoints):
        (xNumpy,yNumpy,points) = averagePoints(xNumpy,yNumpy,points)		
    if(centerwithpoints):
        [xCenter, yCenter] = getCenterCoords(xNumpy,yNumpy,points)
        xCentered = xNumpy - xCenter
        yCentered = yNumpy - yCenter

    # if(len(sys.argv)>2):
    #     if(sys.argv[2].lower() == "averagepoints"):
    #         (xNumpy,yNumpy,points) = averagePoints(xNumpy,yNumpy,points)		
    #     if(sys.argv[2].lower() == "centerwithpoints"):
    #         [xCenter, yCenter] = getCenterCoords(xNumpy,yNumpy,points)
    #         xCentered = xNumpy - xCenter
    #         yCentered = yNumpy - yCenter
    # if(len(sys.argv)>3):
    #     if(sys.argv[3].lower() == "averagepoints"):
    #         (xNumpy,yNumpy,points) = averagePoints(xNumpy,yNumpy,points)		
    #     if(sys.argv[3].lower() == "centerwithpoints"):
    #         [xCenter, yCenter] = getCenterCoords(xNumpy,yNumpy,points)
    #         xCentered = xNumpy - xCenter
    #         yCentered = yNumpy - yCenter
	
    xMean = np.mean(xNumpy)
    yMean = np.mean(yNumpy)
    print("Average Point: (%f,%f)" % (xMean,yMean))
    print("Average Center Point: (%f,%f)" % getCenterCoords(xNumpy,yNumpy,points))

	# Get the accuracy of a couple different quadrant comparisons
	# All mid points (0th index points) are removed for the accuracy
    lrAcc = getAccuracy(xCentered, yCentered, points, "lr")
    print("Left/Right Accuracy = %f" % lrAcc)
    tbAcc = getAccuracy(xCentered, yCentered, points, "tb")
    print("Top/Bottom Accuracy = %f" % tbAcc)
    quadrantAcc = getAccuracy(xCentered, yCentered, points, "quad")
    print("Quadrant Accuracy = %f" % quadrantAcc)

    
    print("0th variances, eNorm : (%f, %f), %f" % getVarianceByPoint(xNumpy, yNumpy, points, 0))
    print("1th variances, eNorm : (%f, %f), %f" % getVarianceByPoint(xNumpy, yNumpy, points, 1))
    print("2th variances, eNorm : (%f, %f), %f" % getVarianceByPoint(xNumpy, yNumpy, points, 2))
    print("3th variances, eNorm : (%f, %f), %f" % getVarianceByPoint(xNumpy, yNumpy, points, 3))
    print("4th variances, eNorm : (%f, %f), %f" % getVarianceByPoint(xNumpy, yNumpy, points, 4))
    
    drawPlot = True
    if(drawPlot):
	# Draw quadrants 
        plt.plot([np.min(xCentered),np.max(xCentered)],[0,0], color='b')
        plt.plot([0,0],[np.min(yCentered),np.max(yCentered)], color='b')

	# Plot points and color them
        color = points/4.0
        cmap = cm.get_cmap()
        plt.scatter(xCentered, yCentered, c=cmap(color))
	
	# patch0 = mpatches.Patch(color=cmap(0.0), label='PointPosition = 0')
        patch1 = mpatches.Patch(color=cmap(.25), label='PointPosition = 1')
        patch2 = mpatches.Patch(color=cmap(.5), label='PointPosition = 2')
        patch3 = mpatches.Patch(color=cmap(.75), label='PointPosition = 3')
        patch4 = mpatches.Patch(color=cmap(1.0), label='PointPosition = 4')
        plt.legend(handles=[patch1,patch2,patch3,patch4])
        plt.xlabel("Predicted X Coordinate")
        plt.ylabel("Predicted Y Coordinate")
        plt.title("Rectangle Corners Test")
        plt.show()

    return 

def readData(path):
	pointList = []
	xList = []
	yList = []
	perimeterPercentList = []
	eyeMetricList = []
	isRingLightList = []

	
	try: 
		data = json.load(open(path))
	except:
		data = open(path,"r")

	for line in data:
		if(line.strip()[0]=='#'):
			continue
		try:
			entryJSON = json.loads(line);
			(x,y) = coordsToXY(entryJSON['coords'])
			point = float(entryJSON['currentPosition'])
			perimeterPercent = float(entryJSON['perimeterPercent'])
			eyeMetric = [float(entryJSON['eyeMetric'][0]),float(entryJSON['eyeMetric'][1])]
			isRingLight = entryJSON['isRingLight'] == 'true'

			pointList.append(point)
			xList.append(x)
			yList.append(y)
			perimeterPercentList.append(perimeterPercent)
			eyeMetricList.append(eyeMetric)
			isRingLightList.append(isRingLight)
		except:
			(point,x,y) = line.replace(',','').replace('\n','').split(" ")
			(point,x,y) = (float(point), float(x), float(y))

			pointList.append(point)
			xList.append(x)
			yList.append(y)

	if(len(pointList) == 0):
		sys.exit("Data is empty")

	return (np.array(pointList), np.array(xList), np.array(yList), \
			np.array(perimeterPercentList), np.array(eyeMetricList), np.array(isRingLightList))

def filterByPoint(_x, _y, _p, point):
    zeroIndices = np.where(_p == point)
    p = _p[zeroIndices]
    x = _x[zeroIndices]
    y = _y[zeroIndices]

    return (x, y)

def coordsToXY(coords):
	(x, y) = coords.replace(',','').replace('\n','').split(" ")
	return (float(x), float(y))

def getCenterCoords(_x,_y,_p):
    [x,y] = filterByPoint(_x, _y, _p, 0);    
    return (np.mean(x), np.mean(y))
    
	
def getAccuracy(_x,_y,_p, regions):
	# regions= {"lr", "tb", "quad"} which choses what regions we want the 
	# accuracy to pertain to. 

	# Filtered for the middle point, the point labeled as 0
	nonZeroIndices = np.where(_p != 0)
	p = _p[nonZeroIndices]
	x = _x[nonZeroIndices]
	y = _y[nonZeroIndices]

	xCentered = centerData(x)
	yCentered = centerData(y)

	totalCount = len(x)
	quadrants = getQuadrant(xCentered, yCentered)


	if(regions == "quad"):
		hits = np.where(p == quadrants)[0]
		totalHits = len(hits)

	if(regions == "tb"):
		side1 = [1,2]
		side2 = [3,4]
		totalHits = getSideHits(p,quadrants,side1,side2)

	if(regions == "lr"):
		side1 = [1,4]
		side2 = [2,3]
		totalHits = getSideHits(p,quadrants,side1,side2)
		
	return (totalHits/totalCount)

def averagePoints(xNumpy,yNumpy,points):
	xAverage = []
	yAverage = []
	pointsAverage = []

	previousPoint = points[0]
	xTempSum = 0
	yTempSum = 0
	count = 0
	for i in range(len(points)):
		if(points[i] == previousPoint):
			xTempSum += xNumpy[i]
			yTempSum += yNumpy[i]
			count += 1
			previousPoint = points[i]
		else:
			xAverage.append(xTempSum/count)
			yAverage.append(yTempSum/count)
			pointsAverage.append(previousPoint)
			xTempSum = xNumpy[i]
			yTempSum = yNumpy[i]	
			count = 1
			previousPoint = points[i]
	xAverage.append(xTempSum/count)
	yAverage.append(yTempSum/count)
	pointsAverage.append(previousPoint)

	return (np.array(xAverage), np.array(yAverage), np.array(pointsAverage))
				


def getPtsInQuads(p,quad1,quad2):
	# Returns a boolean which is true for the points that are 
	# in one of the two given quadrants
	ptsInQuad1 = p == quad1
	ptsInQuad2 = p == quad2
	ptsInCombined = np.logical_or(ptsInQuad1, ptsInQuad2)
	return ptsInCombined

def getSideHits(p,quadrants,side1,side2):

	firstHits = np.logical_and(
		getPtsInQuads(p,side1[0],side1[1]), getPtsInQuads(quadrants,side1[0],side1[1]))
	secondHits = np.logical_and(
		getPtsInQuads(p,side2[0],side2[1]), getPtsInQuads(quadrants,side2[0],side2[1]))
	hits = len(np.where(firstHits)[0]) + len(np.where(secondHits)[0])
	return hits

	
def getQuadrant(x,y):
	# a return of 0 means the point was on a board
	quadrants = []

	for i in range(0,len(x)):
		if(x[i] > 0 and y[i] > 0):
			quadrants.append(1)
		elif(x[i] < 0 and y[i] > 0):
			quadrants.append(2)
		elif(x[i] < 0 and y[i] < 0):
			quadrants.append(3)
		elif(x[i] > 0 and y[i] < 0):
			quadrants.append(4)
		else:
			quadrants.append(0)

	return np.array(quadrants)


def centerData(dNumpy):
	dMean = np.mean(dNumpy)
	dCentered = dNumpy - dMean
	return dCentered

def cleanForZeroPoint(_x,_y,_p):
	nonZeroIndices = np.where(_p != 0)
	p = _p[nonZeroIndices]
	x = _x[nonZeroIndices]
	y = _y[nonZeroIndices]
	return (x,y,p)

def findAB(trueTheta, X, Y):

	trueTheta = np.array(trueTheta)
	X = np.array(X)
	Y = np.array(Y)
	maxCorr = 0;
	maxA = 0
	maxB = 0
	step = np.linspace(-5,5,100);

	for a in step:
		for b in step:

			tP = np.arctan((Y+b)/(X+a))
			curCorr = corr(trueTheta, tP)
			if(curCorr > maxCorr):
				maxCorr = curCorr
				maxA = a
				maxb = b

	return  maxA, maxB, maxCorr

def checkArgs(x, y, points):
	return x,y,points

def corr(t,tP):
	t=np.array(t)
	tP=np.array(tP)
	numer = np.sum((t-t.mean())*(tP-tP.mean()))
	denom = (np.sum((t-t.mean())**2)*np.sum((tP-tP.mean())**2))**.5
	if(denom == 0):
		return 0
	else:
		return numer/denom

def getVarianceByPoint(_x,_y,_p,point):
    [x,y] = filterByPoint(_x,_y,_p,point)
    xCentered = x - np.mean(x)
    yCentered = y - np.mean(y)
    
    eNorm = np.mean(np.sqrt(np.square(xCentered) + np.square(yCentered)))
    return (np.var(x), np.var(y), eNorm)

def makeReport(path):
	accuracyEdgeMetricReport(path,'')

def accuracyEdgeMetricReport(path, subpath):
	global dataFileName
	currentPath = path + subpath
	if(dataFileName in os.listdir(currentPath)):
		saveDataString = accuracyForFile(currentPath + '/' +  dataFileName)
		file = open(path + '/' + reportFileName, 'a+')
		file.write(saveDataString + '\n')
		file.close()
	else: 
		for nextPath in os.listdir(currentPath):
			accuracyEdgeMetricReport(path,subpath+'/'+nextPath)

def isPartialDataFileName(fileNames):
	for fileName in fileNames:
		if(".txt" in fileName):
			return fileName
	return -1

def accuracyForFile(filePath):
    (points, xNumpy, yNumpy, perimeterPercentNumpy, eyeMetricNumpy, isRingLightNumpy) = readData(filePath);
    [xCenter, yCenter] = getCenterCoords(xNumpy,yNumpy,points)
    xCentered = xNumpy - xCenter
    yCentered = yNumpy - yCenter

    lrAcc = getAccuracy(xCentered, yCentered, points, "lr")
    tbAcc = getAccuracy(xCentered, yCentered, points, "tb")
    quadrantAcc = getAccuracy(xCentered, yCentered, points, "quad")
    
    if(len(isRingLightNumpy)==0):
    	isRingLightValue = "null"
    else:
    	isRingLightValue = 1 if isRingLightNumpy[0] else 0
    if(len(perimeterPercentNumpy) == 0):
    	perimeterPercentValue = "null"
    else:
    	perimeterPercentValue = perimeterPercentNumpy[0]
    if(len(eyeMetricNumpy) == 0):
    	eyeMetricAverageValue = "null"
    else:
    	xAvgMetric = np.mean([x[0] for x in eyeMetricNumpy])
    	yAvgMetric = np.mean([x[1] for x in eyeMetricNumpy])
    	eyeMetricAverageValue = [xAvgMetric, yAvgMetric]
    	
    eNorms = []
    variances = []
    for i in range(0,5):
    	[xVar, yVar, enorm] = getVarianceByPoint(xNumpy, yNumpy, points, i)
    	eNorms.append(enorm);
    	variances.append([xVar, yVar])

    saveData = {
        "path" : filePath,
        "lrAccuracy" : lrAcc,
        "tbAccuracy" : tbAcc,
        "quadrantAccuracy" : quadrantAcc,
        "isRingLight" : isRingLightValue,
        "perimeterPercent" : perimeterPercentValue,
        "eyeMetricAverage" : eyeMetricAverageValue,
        "centerCoord" : [xCenter, yCenter],
        "eNorms" : eNorms,
        "variances" : variances,
    }

    return json.dumps(saveData)

def plotFromReport(reportPath, xLabel, yLabel):

	[xList, yList] = readReport(reportPath, xLabel, yLabel)
	
	try:
		correlation = corr(xList, yList)
		print("Correlation between %s and %s: %d" % (xLabel, yLabel, correlation))
	except Exception as e:
		# print(e)
		print("Quantitative values needed for Correlation")

	plt.scatter(xList, yList)
	plt.xlabel(xLabel)
	plt.ylabel(yLabel)
	plt.show()

def readReport(reportPath, xLabel, yLabel):
	data = open(reportPath,"r")
	xList = []
	yList = []

	for line in data:
		entryJSON = json.loads(line);
		xEntry = entryJSON[xLabel]
		yEntry = entryJSON[yLabel]
		if(isinstance(xEntry, list)):
			xEntry = np.mean(np.array(xEntry))
		if(isinstance(yEntry, list)):
			yEntry = np.mean(np.array(yEntry))
		xList.append(xEntry)
		yList.append(yEntry)

	return (xList, yList)

# main(sys.argv[1:len(sys.argv)])

