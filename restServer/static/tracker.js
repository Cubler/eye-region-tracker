let TRACKER = {

	eyeBoxLength: 0,
	faceArray: [],
	faceBoxCorner : [0,0],
	faceBoxLength: 0,
	leftEyeBoxCorner : [0,0],
	rightEyeBoxCorner : [0,0],
	trackingTask: null,

	saveCanvas: null,
	saveContext: null,
	saveVid: null,
	saveVidWidth: 1280,
    saveVidHeight: 720,
    trackCanvas: null,
    trackContext: null,
    trackVid: null,
    trackVidHeight: 240,
    trackVidWidth: 320,
    videoWRatio: null,
    videoHRatio: null,

    showFaceFeatures: false,

  
    

	createVidElements: () => {
		TRACKER.trackVid = document.createElement('video');
		TRACKER.trackVid.id = 'trackVid';
		TRACKER.trackVid.width = TRACKER.trackVidWidth;
		TRACKER.trackVid.height = TRACKER.trackVidHeight;

		TRACKER.saveVid = document.createElement('video');
		TRACKER.saveVid.width = TRACKER.saveVidWidth;
		TRACKER.saveVid.height = TRACKER.saveVidHeight;

		TRACKER.saveCanvas = document.createElement('canvas');
		TRACKER.saveCanvas.width = TRACKER.saveVidWidth;
		TRACKER.saveCanvas.height = TRACKER.saveVidHeight;

		TRACKER.trackCanvas = document.createElement('canvas');
		TRACKER.trackCanvas.width = TRACKER.trackVidWidth;
		TRACKER.trackCanvas.height = TRACKER.trackVidHeight;

		TRACKER.saveContext = TRACKER.saveCanvas.getContext('2d');
		TRACKER.trackContext = TRACKER.trackCanvas.getContext('2d');

		TRACKER.videoWRatio = TRACKER.saveVidWidth/TRACKER.trackVidWidth;
		TRACKER.videoHRatio = TRACKER.saveVidHeight/TRACKER.trackVidHeight;

		document.body.appendChild(TRACKER.trackVid);
	},

	drawLandmarks: ([lx,ly], [rx,ry], [fx,fy], eyeBoxLength, faceBoxLength, landmarks) => {

        TRACKER.trackContext.strokeStyle = '#a64ceb';
        TRACKER.trackContext.strokeRect(lx, ly, eyeBoxLength, eyeBoxLength);
        TRACKER.trackContext.strokeRect(rx, ry, eyeBoxLength, eyeBoxLength);
        TRACKER.trackContext.strokeRect(fx, fy, faceBoxLength, faceBoxLength);

        for(let l in landmarks){
                TRACKER.trackContext.beginPath();
                TRACKER.trackContext.fillStyle = "#fff"
                TRACKER.trackContext.arc(landmarks[l][0],landmarks[l][1],1,0,2*Math.PI);
                TRACKER.trackContext.fill();
        }
    },

    edgeDetection: (imageData) => {
		let edgeData = tracking.Image.sobel(imageData.data, imageData.width, imageData.height);
		return [edgeData , imageData.width, imageData.height]
	},

	// Returns the imageData object of the desired box on the saveCanvas
	getCropedRegion: ([x,y,boxWidth,boxHeight]) => {
        TRACKER.saveContext.drawImage(TRACKER.saveVid, 0, 0, TRACKER.saveCanvas.width, TRACKER.saveCanvas.height);
        let imageData = TRACKER.saveContext.getImageData(x,y, boxWidth, boxHeight);
        return imageData;
	},


	// Maps the points saved from the detection canvas to the corresponding points on the saveCanvas
	// and formats them into a JSON String
	getFormatFaceFeatures: () => {
        document.getElementById("saveCanvas").style.filter="invert(0%)";

	    let [lx,ly] = [TRACKER.leftEyeBoxCorner[0]*DISPLAY.videoWRatio, TRACKER.leftEyeBoxCorner[1]*DISPLAY.videoHRatio];
        let [rx,ry] = [TRACKER.rightEyeBoxCorner[0]*DISPLAY.videoWRatio, TRACKER.rightEyeBoxCorner[1]*DISPLAY.videoHRatio];
        let [fx,fy] = [TRACKER.faceBoxCorner[0]*DISPLAY.videoWRatio, TRACKER.faceBoxCorner[1]*DISPLAY.videoHRatio];
	    let eyeBoxSide = TRACKER.eyeBoxLength * DISPLAY.videoWRatio;
	    let faceBoxSide = TRACKER.faceBoxLength * DISPLAY.videoWRatio;
	    let faceArray = TRACKER.faceArray.map(x=>[x[0]*DISPLAY.videoWRatio,x[1]*DISPLAY.videoHRatio]);

	    let features = {'leftEye': [lx,ly,eyeBoxSide,eyeBoxSide],
	                'rightEye': [rx,ry,eyeBoxSide,eyeBoxSide],
	                'face': [fx,fy,faceBoxSide,faceBoxSide],
	                'faceGridPoints' : faceArray
	     	       };
	    features = JSON.stringify(features);

	    return features;
	},

	getModelPics: (features) => {
        let wholeImage = TRACKER.getSaveCanvasImageData();
        let imageLeft = TRACKER.saveContext.getImageData.apply(TRACKER.saveContext, features['leftEye']);
        let imageRight = TRACKER.saveContext.getImageData.apply(TRACKER.saveContext, features['rightEye']);
        let imageFace = TRACKER.saveContext.getImageData.apply(TRACKER.saveContext, features['face']);
        return [wholeImage, imageLeft, imageRight, imageFace]
    },

    getSaveCanvasImageData: () => {
        TRACKER.saveContext.drawImage(TRACKER.saveVid, 0, 0, TRACKER.saveCanvas.width, TRACKER.saveCanvas.height);
        return TRACKER.saveContext.getImageData(0, 0, TRACKER.saveCanvas.width, TRACKER.saveCanvas.height);
    },

	myTrackerCallback: (landmarks) => {
    	// Extracts the array of points that coorespond to the left and right eye, 
    	// and the face. The slice index, correspond to the indexes for trackingjs's features
    	
        let leftArray = landmarks.slice(23,26);
        let rightArray = landmarks.slice(19,22);
        let faceArray = landmarks.slice(0,15);

        if(landmarks.length < 2){
			return;
		}else{
       		
        	TRACKER.setFeatureBoxes(leftArray, rightArray, faceArray);
        	if(TRACKER.showFaceFeatures){
			    TRACKER.trackContext.clearRect(0,0,TRACKER.trackVidWidth, TRACKER.trackVidHeight);
			    TRACKER.drawLandmarks(TRACKER.leftEyeBoxCorner, 
        		TRACKER.rightEyeBoxCorner, TRACKER.faceBoxCorner, TRACKER.eyeBoxLength,
        		TRACKER.faceBoxLength, landmarks)
        	}
        }
    },

    // sets the feature box variables with respect to the detection canvas
    setFeatureBoxes: (leftArray, rightArray, faceArray) => {
    	let [lxc,lyc,lw,lh] = TRACKER.targetBoxParams(leftArray,'eye');
        let [rxc,ryc,rw,rh] = TRACKER.targetBoxParams(rightArray,'eye');
	    let [fxc,fyc,fw,fh] = TRACKER.targetBoxParams(faceArray,'face');

	    let eyeW = Math.max(lw,rw);
	    let eyeH = Math.max(lh,rh);

        TRACKER.eyeBoxLength = Math.max(eyeW,eyeW);
        TRACKER.faceBoxLength = Math.max(fw,fh);

		TRACKER.rightEyeBoxCorner = [rxc-(TRACKER.eyeBoxLength/2), ryc-(TRACKER.eyeBoxLength/2)];
        TRACKER.leftEyeBoxCorner = [lxc-(TRACKER.eyeBoxLength/2), lyc-(TRACKER.eyeBoxLength/2)];
        TRACKER.faceBoxCorner = [fxc-(TRACKER.faceBoxLength/2), fyc-(TRACKER.faceBoxLength/2)];
        TRACKER.faceArray = faceArray;
    },





	setup: () => {
		let tracker = new tracking.LandmarksTracker();
		tracker.setInitialScale(4);
		tracker.setStepSize(2);
		tracker.setEdgesDensity(0.1);

		TRACKER.createVidElements();

		TRACKER.trackingTask = tracking.track('#'+TRACKER.trackVid.id, tracker, { camera: true });

		tracker.on('track', function(event) {

		    if(!event.data){
	            return;
	        }else{
		    	event.data.landmarks.forEach(function(landmarks){
                    TRACKER.myTrackerCallback(landmarks);
                });
		    }
		});

		let constraints = {audio: false, video: {width: TRACKER.saveVidWidth, height: TRACKER.saveVidHeight}};
		navigator.mediaDevices.getUserMedia(constraints).then(function(mediaStream){
			TRACKER.saveVid.srcObject = mediaStream;
			TRACKER.saveVid.onloadedmetadata = function(e){
				TRACKER.saveVid.play();
			};
		}).catch(function(err){
			console.log(err.name +": " + err.message);
		});

	},


	// Given the 2-D points array from the face feature detection, 
	// returns the centerPoint, length, and width of the closest fitting box
    targetBoxParams: (pointsArray,feature) => {
	       
	    let pointsXs = pointsArray.map(x=>x[0]);
	    let pointsYs = pointsArray.map(x=>x[1]);

	    let xMin = Math.min.apply(Math, pointsXs); 
	    let xMax = Math.max.apply(Math, pointsXs); 
	    let yMin = Math.min.apply(Math, pointsYs);
	    let yMax = Math.max.apply(Math, pointsYs);

	    let xCenter = (xMax-xMin)/2+xMin;
	    let yCenter = (yMax-yMin)/2+yMin;

	    let w = xMax-xMin;
	    let h = yMax-yMin;

        // Adjust the scale of the box to get a better picture of the eye or face
	    if(feature=='eye'){
	      w = w*2.5;
	      h = h*5; 
	    }if(feature =='face'){
          h = h*1;
          yCenter = yCenter*1;
        }
	    
	    return [xCenter,yCenter, w, h]
	},


};

$(document).ready(() => {
    TRACKER.setup();
});
