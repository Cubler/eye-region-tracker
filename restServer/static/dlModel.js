let DLMODEL = {
    modelDir : './static/models',

	prototxtUrl : null,
	caffemodelUrl : null,
	model : null,
    untilLayer : undefined,
    dl : deeplearnCaffe.dl,


	setup: () => {
		DLMODEL.prototxtUrl = DLMODEL.modelDir + '/itracker_deploy.prototxt',
		DLMODEL.caffemodelUrl = DLMODEL.modelDir + '/itracker25x_iter_92000.caffemodel',

		DLMODEL.model = new deeplearnCaffe.CaffeModel(DLMODEL.caffemodelUrl, DLMODEL.prototxtUrl)
        DLMODEL.loadModel().then(()=>{
            console.log("model loaded")
        });
	},

    loadModel: async () => {
        if (DLMODEL.dl == null) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log('Loading model structure and weights..');
        await DLMODEL.model.load();
        await DLMODEL.model.load_binaryproto(DLMODEL.modelDir+'/mean_images/mean_left_224.binaryproto');
        DLMODEL.model.variables['mean_left'] = [DLMODEL.model.getPreprocessOffset()];
        
        await DLMODEL.model.load_binaryproto(DLMODEL.modelDir+'/mean_images/mean_right_224.binaryproto');
        DLMODEL.model.variables['mean_right'] = [DLMODEL.model.getPreprocessOffset()];
        
        await DLMODEL.model.load_binaryproto(DLMODEL.modelDir+'/mean_images/mean_face_224.binaryproto');
        DLMODEL.model.variables['mean_face'] = [DLMODEL.model.getPreprocessOffset()];            

        return "Done";

    },

    formatModelInput: (l,r,f,g) => {
        var inputLeft = DLMODEL.dl.Array3D.fromPixels(l);
        var inputRight = DLMODEL.dl.Array3D.fromPixels(r)
        var inputFace = DLMODEL.dl.Array3D.fromPixels(imageFace);
        var inputFaceGrid = DLMODEL.dl.Array1D.zeros([625]);

        inputLeft = DLMODEL.dl.ENV.math.resizeBilinear3D(inputLeft,[224,224])
        inputRight = DLMODEL.dl.ENV.math.resizeBilinear3D(inputRight,[224,224])
        inputFace = DLMODEL.dl.ENV.math.resizeBilinear3D(inputFace,[224,224])

        inputLeft = DLMODEL.dl.ENV.math.transpose(inputLeft,[1,0,2])
        inputRight = DLMODEL.dl.ENV.math.transpose(inputRight,[1,0,2])
        inputFace = DLMODEL.dl.ENV.math.transpose(inputFace,[1,0,2])

        return [inputLeft, inputRight, inputFace, inputFaceGrid]
    },

    getCoords: () => {
        var [imageLeft, imageRight, imageFace, faceGrid] = UTIL.getModelInput();
        [imageLeft, imageRight, imageFace, faceGrid] = DLMODEL.formatModelInput(imageLeft, imageRight, imageFace, faceGrid)

        var output = DLMODEL.model.predict([imageLeft, imageRight, imageFace, faceGrid], DLMODEL.untilLayer, (n,l,a) => { });
        // output.getValuesAsync().then((coords)=>{
        //     resolve(coords);
        // });
        return output.getValues();
    },
}


$(document).ready(() => {
	DLMODEL.setup();
});
