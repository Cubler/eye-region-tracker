
let GAZEMODEL = {

	image = new ImgJS.Image();

	meanImages : {
		"image_left" : null,
		"image_right" : null,		
		"image_face" : null,
	},
	meanPaths : {
		"image_left" : GAZEMODEL.modelsPath + "/mean_images/mean_left_224.binaryproto",
		"image_right" : GAZEMODEL.modelsPath + "/mean_images/mean_right_224.binaryproto",		
		"image_face" : GAZEMODEL.modelsPath + "/mean_images/mean_face_224.binaryproto",
	},
	model : null,
	modelsPath = "./static/models",
	pathDeploy : null,
	pathWeights:  null,


	loadModel() => {
		GAZEMODEL.model = new Net.CaffeModel(deployPath, weightsPath);
		GAZEMODEL.model.load();
		GAZEMODEL.setMeans();
	},

	setMeans() => {
		let p = new Parser.BlobProtoParser();
		for(imageName in meanImages)
			p.parse(GAZEMODEL.meanPaths[imageName]).then(function(data){
				GAZEMODEL.meanImages[imageName] = data;
			});
	}

	run(input) => {
		
		let coords = model.forward(input)
	},

	getCoords() => {
		let [imageLeft, imageRight, imageFace, faceGrid] = MODEL.getModelInput();
		let inputLeft = image.set(imageLeft, imageLeft.width, imageLeft.height).toVol(
			GAZEMODEL.meanImages['image_left'], [2,1,0]);
		let inputRight = image.set(imageRight, imageRight.width, imageRight.height).toVol(
			GAZEMODEL.meanImages['image_right'], [2,1,0]);
		let inputFace = image.set(imageFace, imageFace.width, imageFace.height).toVol(
			GAZEMODEL.meanImages['image_face'], [2,1,0]);

		let inputFaceGrid = new Net.Vol.fromArray(faceGrid);

		let coords = model.forward(inputLeft, inputRight, inputFace, inputFaceGrid)
		return coords

	},

}