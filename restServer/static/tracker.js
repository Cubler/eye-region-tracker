let TRACKER = {

	leftEyeBoxCorner : [0,0],
	rightEyeBoxCorner : [0,0],
	faceBoxCorner : [0,0],
	faceArray: [],
	eyeBoxLength: 0,
	faceBoxLength: 0,


    myTrackerCallback: (landmarks) => {
        let leftArray = landmarks.slice(23,26);
        let rightArray = landmarks.slice(19,22);
        let faceArray = landmarks.slice(0,15);

        if(landmarks.length < 2){
			return;
		}else{
       
        	TRACKER.setFeatureBoxes(leftArray, rightArray, faceArray);
        	DISPLAY.drawLandmarks(TRACKER.leftEyeBoxCorner, 
        		TRACKER.rightEyeBoxCorner, TRACKER.faceBoxCorner, TRACKER.eyeBoxLength,
        		TRACKER.faceBoxLength, landmarks)
        }
    },

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

	getFormatFaceFeatures: () => {
	    let [lx,ly] = [TRACKER.leftEyeBoxCorner[0]*DISPLAY.videoWRatio, TRACKER.leftEyeBoxCorner[1]*DISPLAY.videoHRatio];
        let [rx,ry] = [TRACKER.rightEyeBoxCorner[0]*DISPLAY.videoWRatio, TRACKER.leftEyeBoxCorner[1]*DISPLAY.videoHRatio];
        let [fx,fy] = [TRACKER.faceBoxCorner[0]*DISPLAY.videoWRatio, TRACKER.leftEyeBoxCorner[1]*DISPLAY.videoHRatio];
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

	setup: () => {
		let tracker = new tracking.LandmarksTracker();
		tracker.setInitialScale(4);
		tracker.setStepSize(2);
		tracker.setEdgesDensity(0.1);

		tracking.track('#video', tracker, { camera: true });

		tracker.on('track', function(event) {

		    DISPLAY.videoContext.clearRect(0,0,DISPLAY.videoCanvas.width, DISPLAY.videoCanvas.height);

		    if(!event.data){
	            return;
	        }else{
		    	event.data.landmarks.forEach(function(landmarks){
                    TRACKER.myTrackerCallback(landmarks);
                });
		    }
		});

		let constraints = {audio: false, video: {width: 1280, height: 720}};
		navigator.mediaDevices.getUserMedia(constraints).then(function(mediaStream){
			let video = document.getElementById('saveVideo');
			video.srcObject = mediaStream;
			video.onloadedmetadata = function(e){
				video.play();
			};
		}).catch(function(err){
			console.log(err.name +": " + err.message);
		});

	},

};

$(document).ready(() => {
    TRACKER.setup();
});
