let DLMODEL = {
    modelDir : './static/models',

	prototxtUrl : null,
	caffemodelUrl : null,
	model : null,
    untilLayer : undefined,
    dl : deeplearnCaffe.dl,
    loaded: false,


	setup: () => {
		DLMODEL.prototxtUrl = DLMODEL.modelDir + '/itracker_deploy.prototxt',
		DLMODEL.caffemodelUrl = DLMODEL.modelDir + '/itracker25x_iter_92000.caffemodel',

		DLMODEL.model = new deeplearnCaffe.CaffeModel(DLMODEL.caffemodelUrl, DLMODEL.prototxtUrl)
        DLMODEL.loadModel().then(()=>{
            DLMODEL.loaded = true;
            console.log("model loaded")
        });
	},

    // Loads the model and the mean images from .prototxt, storing the mean images in
    // their corresponding model.variables location so they can be used in the input layer 
    // of model.predict()
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

    // Given the left, right, and face images as ImageData and facegrid as an array,
    // returns the inputs for the model formated to align correctly with the neural network filters
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
        if(!DLMODEL.loaded){
            alert('Please wait for the model to load')
            return [0,0];
        }else {

            var [imageLeft, imageRight, imageFace, faceGrid] = UTIL.getModelInput();
            [imageLeft, imageRight, imageFace, faceGrid] = DLMODEL.formatModelInput(imageLeft, imageRight, imageFace, faceGrid)

            var output = DLMODEL.model.predict([imageLeft, imageRight, imageFace, faceGrid], DLMODEL.untilLayer, (n,l,a) => { });
        
            // .getValues() will block and take on the order of 0.3 seconds to resolve
            // .getValuesAsync() is an alternative, or you can promise around .getCoords()
            return output.getValues();
        }
    },
}


$(document).ready(() => {
	DLMODEL.setup();
});
