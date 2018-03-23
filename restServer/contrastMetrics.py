import numpy as np
from scipy import misc
from scipy import stats
#import matplotlib.pyplot as plt
from PIL import Image

def hsMetric(imageArray):
	hist = getHist(imageArray)
	hs = histSpread(hist)
	return hs

def hfmMetric(imageArray):
	hist = getHist(imageArray)
	hfm = gMean(hist)/aMean(hist)
	return hfm

def aMean(hist):
	return np.sum(hist)/hist.size

def gMean(hist):
	return np.exp(np.log(hist).sum()/hist.size)

def histSpread(hist):
	return stats.iqr(hist)/np.ptp(hist)

def loadFlatGrayScale(filePath):
	return np.array(Image.open(filePath).convert('LA'))[:,:,0].flatten()

def getHist(array):
	return np.histogram(array, bins='auto')[0]

def plotHist(filePath):
	imgG = loadFlatGrayScale(filePath)
	plt.hist(imgG, bins='auto')
	plt.show()

def rgb2flatGray(rgb):
	return np.dot(rgb[...,:3], [0.299, 0.587, 0.114]).flatten()
