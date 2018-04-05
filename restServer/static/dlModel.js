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

    getCoords: () => {
        return new Promise((resolve, reject) => {
            var start = Date.now();
            var [imageLeft, imageRight, imageFace, faceGrid] = MODEL.getModelInput();
            [imageLeft, imageRight, imageFace, faceGrid] = [DLMODEL.dl.Array3D.fromPixels(imageLeft), DLMODEL.dl.Array3D.fromPixels(imageRight),
             DLMODEL.dl.Array3D.fromPixels(imageFace), DLMODEL.dl.Array1D.new(faceGrid)];

            var output = DLMODEL.model.predict([imageLeft, imageRight, imageFace, faceGrid], DLMODEL.untilLayer, (n,l,a) => { });
            var seconds = (Date.now() - start)/1000;
            console.log("Duration: " + seconds)
            DLMODEL.dl.ENV.math.read(output.dataId).then((coords) => {
                resolve(coords);
            })
        });
    },
}


$(document).ready(() => {
	DLMODEL.setup();
});