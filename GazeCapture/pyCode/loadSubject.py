import json
import numpy
path = "../../00002"



def loadSubject(path):

	# Apple Face Detection
	with open(path+"/appleFace.json") as data_file:
		af = json.load(data_file)

	return af

appleFace=loadSubject(path)