
let GAZEMODEL = {

	// image : new ImgJS.Image(),
    image: null, 

	meanImages : {
		"image_left" : null,
		"image_right" : null,		
		"image_face" : null,
	},
	modelsPath : "./static/models",

	meanPaths : {
		"image_left" : null,
		"image_right" : null,		
		"image_face" : null,
	},
	model : null,

	deployPath : null,
	weightsPath:  null,


	loadModel: () => {
		GAZEMODEL.model = new Net.CaffeModel(GAZEMODEL.deployPath, GAZEMODEL.weightsPath);
		GAZEMODEL.model.load();
		GAZEMODEL.setMeans();
	},

	setMeans: () => {
		let p = new Parser.BlobProtoParser();
        p.parse(GAZEMODEL.meanPaths['image_left']).then(function(data){
            GAZEMODEL.meanImages['image_left'] = data;
        });
        p.parse(GAZEMODEL.meanPaths['image_right']).then(function(data){
            GAZEMODEL.meanImages['image_right'] = data;
        });
        p.parse(GAZEMODEL.meanPaths['image_face']).then(function(data){
            GAZEMODEL.meanImages['image_face'] = data;
        });
	},

	run: (input) => {
		
		let coords = model.forward(input)
	},

	getCoords: () => {
        let start = Date.now();
		let [imageLeft, imageRight, imageFace, faceGrid] = MODEL.getModelInput();
		let inputLeft = GAZEMODEL.image.set(imageLeft, imageLeft.width, imageLeft.height).toVol(
			GAZEMODEL.meanImages['image_left'], [2,1,0]);
		let inputRight = GAZEMODEL.image.set(imageRight, imageRight.width, imageRight.height).toVol(
			GAZEMODEL.meanImages['image_right'], [2,1,0]);
		let inputFace = GAZEMODEL.image.set(imageFace, imageFace.width, imageFace.height).toVol(
			GAZEMODEL.meanImages['image_face'], [2,1,0]);

		let inputFaceGrid = new Net.Vol.fromArray(faceGrid);
        
        let coords = GAZEMODEL.myForward(GAZEMODEL.model, [inputLeft, inputRight, inputFace, inputFaceGrid], false, {start: "image_left"})
        let seconds = (Date.now() - start)/1000;
        console.log("Duration: " + seconds)
		return coords

	},

	myLayerIterator: (model, iteratorFn, params) => {
        var _this = model;
        if (params === void 0) {
            params = {};
        }
        var layerStack = [];
        var edges = [];
        var layer;
        var i = 0;
        // Store the visited nodes
        var visited = d3.set();
        // Forward traversal
        if (params.reverse === undefined || params.reverse === false) {
            // Define the current layer
            layer = params.start ? model.layers.get(params.start) : model.layers.get('data');
            edges = model.edges;
        } else {
            // Define the current layer
            layer = params.start ? model.layers.get(params.start) : model.layers.values()[model.layers.size() - 1];
            edges = model.edges.map(function(d) {
                return {
                    from: d.to,
                    to: d.from
                };
            });
        }
        // Aggregate all edges by the from property
        // Reverse edge directions
        var edgesFrom = d3.map(d3.nest().key(function(d) {
            return d.from;
        }).entries(edges), function(d) {
            return d.key;
        });
        // Aggregate all edges by the to property
        // Reverse edge directions
        var edgesTo = d3.map(d3.nest().key(function(d) {
            return d.to;
        }).entries(edges), function(d) {
            return d.key;
        });
        // Start with the first layer
        layerStack.push(layer);
        layerStack.push(model.layers.get('image_right'));
        layerStack.push(model.layers.get('image_face'));
        layerStack.push(model.layers.get('facegrid'));
        while (layerStack.length) {
            // Take a layer from the stack
            var layer_1 = layerStack.pop();
            // Set the layer visited
            visited.add(layer_1.name);
            // Collect the previous Layers
            var parentKeys = edgesTo.get(layer_1.name);
            var parents = parentKeys === undefined ? undefined : parentKeys.values.map(function(d) {
                return model.layers.get(d.from);
            });
            // Call the iterator callback
            iteratorFn(layer_1, i++, parents);
            // Check if we reached the end layer
            if (params.end && layer_1.name === params.end) {
                break;
            }
            // Get all children for this layer
            var childrenKeys = edgesFrom.get(layer_1.name);
            if (childrenKeys) {
                childrenKeys.values.filter(function(d) {
                    return !visited.has(d.to);
                }).forEach(function(d) {
                    // Check if there are still any unvisited parents
                    // of the next child which need to be visited first
                    var parentKeysOfChild = edgesTo.get(d.to);
                    var unvisitedParents = parentKeysOfChild === undefined ? [] : parentKeysOfChild.values.filter(function(d) {
                        return !visited.has(d.from);
                    });
                    // All previous parents have been visited
                    if (unvisitedParents.length === 0) {
                        // Add the layer to the stack
                        layerStack.push(_this.layers.get(d.to));
                    }
                });
            }
        }

    },

    myForward: (model, V, is_training, params) => {
        if (is_training === void 0) {
            is_training = false;
        }
        if (params === void 0) {
            params = {};
        }
        var activationMap = d3.map();
        var currentActivation;
        GAZEMODEL.myLayerIterator(model, function(layer, i, parents) {
            if (parents === undefined) {
            	switch (layer.name){
            		case 'image_left':
            			currentActivation = V[0];
            			break;
            		case 'image_right':
            			currentActivation = V[1];
            			break;
            		case 'image_face':
						currentActivation = V[2];
            			break;
            		case 'facegrid':
            			currentActivation = V[3];
            			break;
            	}
            } else if (parents.length > 1) {
                currentActivation = parents.map(function(d) {
                    return activationMap.get(d.name);
                });
            } else {
                currentActivation = activationMap.get(parents[0].name);
            }
            currentActivation = layer.forward(currentActivation, is_training);
            activationMap.set(layer.name, currentActivation);
        }, params);
        return currentActivation;
    },

    setup: () => {
        GAZEMODEL.deployPath = GAZEMODEL.modelsPath + "/itracker_deploy.prototxt"
        GAZEMODEL.weightsPath = GAZEMODEL.modelsPath + "/weights/"
        GAZEMODEL.meanPaths = {
	        "image_left" : GAZEMODEL.modelsPath + "/mean_images/mean_left_224.binaryproto",
	        "image_right" : GAZEMODEL.modelsPath + "/mean_images/mean_right_224.binaryproto",		
	        "image_face" : GAZEMODEL.modelsPath + "/mean_images/mean_face_224.binaryproto",
        }
        GAZEMODEL.loadModel();
        
    },

}

$(document).ready(() => {
//    GAZEMODEL.setup();
});


