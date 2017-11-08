window.onload = function() {
	var video = document.getElementById('video');
	var saveVideo = document.getElementById('saveVideo');
	var canvas = document.getElementById('canvas');
	var context = canvas.getContext('2d');
	var coordsDiv = document.getElementById("coords");
    var coordsListDiv = document.getElementById("coordsList");
	var videoWRatio = saveVideo.clientWidth/video.clientWidth;
	var videoHRatio = saveVideo.clientHeight/video.clientHeight;

	var saveCanvas = document.getElementById('save');
	var saveContext = saveCanvas.getContext('2d');
	var features;

	var [lx,ly,lw,lh] = [0,0,0,0];
	var [rx,ry,rw,rh] = [0,0,0,0];
	var [fx,fy,fw,fh] = [0,0,0,0];

	var eyeBoxSide = 0;
	var faceBoxSide = 0;
	var faceArray;

    var fps = 30;
    var revolDuration = 5; // seconds
    var fpRevol = revolDuration*fps;
    var currentRevol = 0;

    var captureRate = 4;
    var coordsList = [];
    var revolPostionList = [];
    var animationTimeout;
    var captureTimeout;
    var featureDetect = false; 
    
    var circleCanvas = document.getElementById("circleCanvas");
    var circleContext = circleCanvas.getContext("2d");
    
    var r = 350;
    var xstart = window.innerWidth/2;
    var ystart = r+50;
    var ptSize = 5;

    circleContext.canvas.width = window.innerWidth; 
    circleContext.canvas.height = 2*r+100;
		
    circleContext.clearRect(0,0,xstart+r+ptSize, ystart+r+ptSize);
    circleContext.beginPath();
    circleContext.arc(xstart,ystart,ptSize,0,2*Math.PI);
	circleContext.fill();
		
	document.getElementById('getPos').addEventListener("click", capture);
	document.getElementById('trackCircle').addEventListener("click", animateCircle);
    document.getElementById('cancelTrack').addEventListener("click", cancelTrack);

	var tracker = new tracking.LandmarksTracker();
	tracker.setInitialScale(4);
	tracker.setStepSize(2);
	tracker.setEdgesDensity(0.1);

	tracking.track('#video', tracker, { camera: true });

	tracker.on('track', function(event) {

	    context.clearRect(0,0,canvas.width, canvas.height);

	    if(!event.data){
            featureDetect = false;
            return;
        }
	    	event.data.landmarks.forEach(function(landmarks) {
                // The landmarks/points that are associated with face features are used here to find the boxes that correspond to each eye and the whole face. 

	            // Left and Right eye
	            var leftArray = landmarks.slice(23,26);
	            var rightArray = landmarks.slice(19,22);
                featureDetect = true;

	            [lxc,lyc,lw,lh] = targetBoxParams(leftArray,'eye');
	            [rxc,ryc,rw,rh] = targetBoxParams(rightArray,'eye');

	            faceArray = landmarks.slice(0,15);
	            [fxc,fyc,fw,fh] = targetBoxParams(faceArray,'face');
	            faceBoxSide = Math.max(fw,fh);

	            // Draw Boxes on canvas 
	            var eyeW = Math.max(lw,rw);
	            var eyeH = Math.max(lh,rh);
	            eyeBoxSide = Math.max(eyeW,eyeW);
	            rx = rxc-(eyeBoxSide/2);
	            ry = ryc-(eyeBoxSide/2);
	            lx = lxc-(eyeBoxSide/2);
	            ly = lyc-(eyeBoxSide/2);
	            fx = fxc-(faceBoxSide/2);
	            fy = fyc-(faceBoxSide/2);

	            context.strokeStyle = '#a64ceb';
	            context.strokeRect(lx, ly, eyeBoxSide, eyeBoxSide);
	            context.strokeRect(rx, ry, eyeBoxSide, eyeBoxSide);
	            context.strokeRect(fx, fy, faceBoxSide, faceBoxSide);

	            for(var l in landmarks){
	            	context.beginPath();
	            	context.fillStyle = "#fff"
	            	context.arc(landmarks[l][0],landmarks[l][1],1,0,2*Math.PI);
	            	context.fill();
	        }
	    });
	});

	var constraints = {audio: false, video: {width: 1280, height: 720}};
	navigator.mediaDevices.getUserMedia(constraints).then(function(mediaStream){
		var video = document.getElementById('saveVideo');
		video.srcObject = mediaStream;
		video.onloadedmetadata = function(e){
			video.play();
		};
	}).catch(function(err){
		console.log(err.name +": " + err.message);
	});

    // Returns the coordinates for the center of the box that goes around an array of points [(x,y),(x2,y2),...], along with the boxes width and height
	targetBoxParams = function(pointsArray,feature){
	       
	    var pointsXs = pointsArray.map(x=>x[0]);
	    var pointsYs = pointsArray.map(x=>x[1]);

	    var xMin = Math.min.apply(Math, pointsXs); 
	    var xMax = Math.max.apply(Math, pointsXs); 
	    var yMin = Math.min.apply(Math, pointsYs);
	    var yMax = Math.max.apply(Math, pointsYs);

	    var xCenter = (xMax-xMin)/2+xMin;
	    var yCenter = (yMax-yMin)/2+yMin;

	    var w = xMax-xMin;
	    var h = yMax-yMin;

        // Adjust the scale of the box to get a better picture of the eye or face
	    if(feature=='eye'){
	      w = w*3;
	      h = h*6; 
	    }
	    
	    return [xCenter,yCenter, w, h]

	  }

    function sendDataToServer(currentRevolPostion){
    	saveContext.clearRect(0,0,saveCanvas.width, saveCanvas.height);
	    saveContext.drawImage(saveVideo,0,0,saveCanvas.width,saveCanvas.height);
    	var dataURL = saveCanvas.toDataURL('image/jpeg');

    	// set up feature data
    	// scale points 
	    eyeBoxSide *= videoWRatio;
	    faceBoxSide *= videoWRatio;
	    lx *= videoWRatio;
	    ly *= videoHRatio;
	    rx *= videoWRatio;
	    ry *= videoHRatio;
	    fx *= videoWRatio;
	    fy *= videoHRatio;
	    faceArray = faceArray.map(x=>[x[0]*videoWRatio,x[1]*videoHRatio]);

	    features = {'leftEye': [lx,ly,eyeBoxSide,eyeBoxSide],
	                'rightEye': [rx,ry,eyeBoxSide,eyeBoxSide],
	                'face': [fx,fy,faceBoxSide,faceBoxSide],
	                'faceGridPoints' : faceArray
	     	       };
	    features = JSON.stringify(features);

    	$.ajax({
    		type: "GET",
    		//url: "https://comp158.cs.unc.edu:8080/capture",
            url: "https://localhost:3000/capture",
    		data: {
    			imgBase64: dataURL,
    			faceFeatures: features,
    		}, 
			success: function(coords){
                    console.log(coords);
        			coordsDiv.value = coords;
                    coordsList.push(currentRevolPostion + " " + coords +'\n');
                    revolPostionList.push(currentRevolPostion);
                    coordsListDiv.value = coordsList;
        	}, error: function(exception){
    			console.log("Capture Exception: " + exception);
    		}
    	});
    }

    function capture(){
        sendDataToServer(currentRevol);
    }

    function cancelTrack(){
        clearTimeout(captureTimeout);
        clearTimeout(animationTimeout);

    }

    function animateCircle(){

        animationTimeout = setInterval(function(){
            drawCircle(currentRevol/fpRevol);
            currentRevol = (currentRevol+1) % fpRevol
        }, 1000/fps );

        captureTimeout = setInterval(function(){
            if(featureDetect){
               sendDataToServer(currentRevol);
            }
        }, 1000/captureRate);
    }

    function drawCircle(currentPercent){
        var theta = 2*Math.PI*currentPercent;
        var x = r*Math.cos(theta);
        var y = r*Math.sin(theta);
		
        circleContext.clearRect(0,0,xstart+r+ptSize, ystart+r+ptSize);
        circleContext.beginPath();
        circleContext.arc(x+xstart,y+ystart,ptSize,0,2*Math.PI);
	    circleContext.arc(xstart,ystart,ptSize,0,2*Math.PI);
		circleContext.fill();
		
    }

	// var gui = new dat.GUI();
	// gui.add(tracker, 'edgesDensity', 0.1, 0.5).step(0.01).listen();
	// gui.add(tracker, 'initialScale', 1.0, 10.0).step(0.1).listen();
	// gui.add(tracker, 'stepSize', 1, 5).step(0.1).listen();

};
