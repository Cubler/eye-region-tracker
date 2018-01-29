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
    	let [lxc,lyc,lw,lh] = targetBoxParams(leftArray,'eye');
        let [rxc,ryc,rw,rh] = targetBoxParams(rightArray,'eye');
	    let [fxc,fyc,fw,fh] = targetBoxParams(faceArray,'face');

	    let eyeW = Math.max(lw,rw);
	    let eyeH = Math.max(lh,rh);

		TRACKER.rightEyeBoxCorner = [rxc-(eyeBoxSide/2), ryc-(eyeBoxSide/2)];
        TRACKER.leftEyeBoxCorner = [lxc-(eyeBoxSide/2), lyc-(eyeBoxSide/2)];
        TRACKER.faceBoxCorner = [fxc-(faceBoxSide/2), fyc-(faceBoxSide/2)];
        TRACKER.faceArray = faceArray;
        TRACKER.eyeBoxLength = Math.max(eyeW,eyeW);
        TRACKER.faceBoxSide = Math.max(fw,fh);

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
	    let [lx,ly] = TRACKER.leftEyeBoxCorner.map(x=>[x[0]*videoWRatio,x[1]*videoHRatio]);;
        let [rx,ry] = TRACKER.rightEyeBoxCorner.map(x=>[x[0]*videoWRatio,x[1]*videoHRatio]);;
        let [fx,fy] = TRACKER.faceBoxCorner.map(x=>[x[0]*videoWRatio,x[1]*videoHRatio]);;
	    let eyeBoxSide = TRACKER.eyeBoxLength * videoWRatio;
	    let faceBoxSide = TRACKER.faceBoxLength * videoWRatio;
	    let faceArray = TRACKER.faceArray.map(x=>[x[0]*videoWRatio,x[1]*videoHRatio]);

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

		    context.clearRect(0,0,canvas.width, canvas.height);

		    if(!event.data){
	            return;
	        }else{
		    	event.data.landmarks.forEach(myTrackerCallback(landmarks));
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
    TRACKER.setup()
});
