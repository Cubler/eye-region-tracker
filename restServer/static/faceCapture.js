window.onload = function() {
	var video = document.getElementById('video');
	var saveVideo = document.getElementById('saveVideo');
	var canvas = document.getElementById('canvas');
	var context = canvas.getContext('2d');
	var coordsDiv = document.getElementById("coords");
    var coordsListDiv = document.getElementById("coordsList");
	var saveCanvas = document.getElementById('save');
	var saveContext = saveCanvas.getContext('2d');
	var trackButton = document.getElementById('trackButton');
    var saveWidth = 800
    var saveHeight = 600
    var eps = 0.00001;
    
    saveCanvas.width = saveWidth
    saveCanvas.height = saveHeight
    saveVideo.width = saveWidth
    saveVideo.height = saveHeight


    var videoWRatio = saveVideo.clientWidth/video.clientWidth;
	var videoHRatio = saveVideo.clientHeight/video.clientHeight;

	var positionChoice = document.getElementById("positionChoice");

	var features;
    
//	var downloadLnk = document.getElementById('downloadLnk');
//	downloadLnk.addEventListener('click', download, false);

	var [lx,ly,lw,lh] = [0,0,0,0];
	var [rx,ry,rw,rh] = [0,0,0,0];
	var [fx,fy,fw,fh] = [0,0,0,0];

	var eyeBoxSide = 0;
	var faceBoxSide = 0;
	var faceArray;

    var fps = 1/2;
    var revolDuration = 5; // seconds
    var fpRevol = revolDuration*fps;
    var currentRevol = 0;

    var captureRate = 1;
    var coordsList = [];
    var tempCoordsList = [];
    var revolPostionList = [];
    var animationTimeout;
    var captureTimeout;
    var sendTrackDataTimeout;
    var featureDetectTimeout;
	var featureDetect = false; 
	var revCounter = 0;
    var isTracking = false;    

    var circleCanvas = document.getElementById("circleCanvas");
    var circleContext = circleCanvas.getContext("2d");
    
    var offset = 50;
    var r = 350;
    var xoffset = window.innerWidth/2-offset;
    var xstart = window.innerWidth/2;
    var ystart = r+offset;
    var ptSize = 5;

	circleContext.canvas.height = 2*r+2*offset;
	window.addEventListener('resize', resizeCanvas, false);
	resizeCanvas();

	drawRectPoints(0);
    trackButton.disabled = true;
	
	document.getElementById('getPos').addEventListener("click", capture);
	document.getElementById('trackButton').addEventListener("click", animateRectPoints);
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
                if(landmarks.length < 2){
					featureDetect = false;
					return;
				}
				featureDetect = true;
                if(!isTracking){
                    trackButton.disabled = false;
	    			thresholdFeatureDetect();
                }	
			
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
	      w = w*2.5;
	      h = h*5; 
	    }if(feature =='face'){
          h = h*1;
          yCenter = yCenter*1;
        }
	    
	    return [xCenter,yCenter, w, h]

	  }

    function sendDataToServer(currentRevolPostion){
        if(!featureDetect){
            return;
        }    	
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
                    coordsListDiv.value = coordsList;
					timeOutSendTrackData()
					
        	}, error: function(exception){
                timeOutSendTrackData()
    			console.log("Capture Exception: " + exception);
    		}
    	});
    }

    function capture(){
		drawRectPoints(positionChoice.value);
		setTimeout(function(){
	        sendDataToServer(positionChoice.value);
		}, 500);
    }

    function cancelTrack(){
        clearTimeout(captureTimeout);
        clearTimeout(animationTimeout);
        coordsListDiv.value = coordsList;
		trackButton.disabled = false;
        isTracking = false;

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

    function animateRectPoints(){
		xoffset = window.innerWidth/2-offset;
    	xstart = window.innerWidth/2;
        
		circleContext.canvas.width = window.innerWidth; 
	    circleContext.canvas.height = 2*r+2*offset;

        isTracking = true;
        trackButton.disabled = true;
		var currentPoint = -1;
		revCounter = 0;        
        coordsList = [];
		drawRectPoints(0);
		
		animationTimeout = setInterval(function(){
            previousPoint = currentPoint % 5
			currentPoint = (currentPoint +1) % 5;
            tempCoordsList = [];
            coordsListDiv.value = coordsList;
			revCounter += 1;

			if(revCounter > (3*5)){
				cancelTrack();
				alert('Please wait for data to send. This may take a moment. Another window like this will pop up when the data is sent. Thank you for your patience.')
                return;
			}
			transitionRecPoint(previousPoint, currentPoint)			
//            setTimeout(function(){
//				drawRectPoints(currentPoint);
//			}, 1100);

			captureTimeout = setTimeout(function(){
				if(featureDetect){
					sendDataToServer(currentPoint);
				} 
			}, 1750);

			captureTimeout = setTimeout(function(){
				if(featureDetect){
					sendDataToServer(currentPoint);
				} 
			}, 2000);

			captureTimeout = setTimeout(function(){
				if(featureDetect){
					sendDataToServer(currentPoint);
				} 
			}, 2250);
        }, 3000 );

    }

	function transitionRecPoint(previousPoint, currentPoint){
        // currentPoint = 0-4, 0 = middle of screen,
        // 1 = top right and go clockwise from there
        var [x1,y1] = getXYPoint(previousPoint);
        var [x2,y2] = getXYPoint(currentPoint);

		xDiff = -(x1*xoffset-x2*xoffset)
		yDiff = -(y1*r-y2*r)
		stepRatio = 0.05
		currRatio = stepRatio

		transition = setInterval(function(){
			circleContext.clearRect(0,0,circleContext.canvas.width, circleContext.canvas.height);
	        circleContext.beginPath();
    	    circleContext.arc(xstart+(x1*xoffset)+xDiff*currRatio,(y1*r)+ystart+yDiff*currRatio,ptSize,0,2*Math.PI);
			circleContext.fill();
			currRatio = currRatio + stepRatio
		    if(currRatio > 1.0+eps){
				clearTimeout(transition);
			}
		}, 75);
	        
	}
	
	function getXYPoint(point){
		var x = null;
		var y = null;
		switch(parseInt(point)){
            case 0: x=0;
                    y=0;
                    break;
            case 1: x=1;
                    y=-1;
                    break;
            case 2: x=-1;
                    y=-1;
                    break;
            case 3: x=-1;
                    y=1;
                    break;  
            case 4: x=1;
                    y=1;
                    break; 
    	}
		return [x,y]
	}

    function resizeCanvas(){
		xoffset = window.innerWidth/2-offset;
   		xstart = window.innerWidth/2;
		circleContext.canvas.width = window.innerWidth;
		drawRectPoints(0);
	}

	function averagePoints(tempCoordsList){
        var xTotal = 0.0
        var yTotal = 0.0
        for(var i=0; i< tempCoordsList.length; i++){
            [tempX, tempY] = tempCoordsList[i].split(',')
            xTotal += parseFloat(tempX.trim())
            yTotal += parseFloat(tempY.trim())
        }
        var xMean = xTotal / tempCoordsList.length
        var yMean = yTotal / tempCoordsList.length
        return xMean + ", " + yMean

    }

    function drawRectPoints(currentPoint){
        // currentPoint = 0-4, 0 = middle of screen,
        // 1 = top right and go clockwise from there
        var [x, y]  = getXYPoint(currentPoint);

        circleContext.clearRect(0,0,circleContext.canvas.width, circleContext.canvas.height);
        circleContext.beginPath();
        circleContext.arc(xstart+(x*xoffset),(y*r)+ystart,ptSize,0,2*Math.PI);
		circleContext.fill();
		
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

	function sendTrackDataToServer(){
	    var dataURL = saveCanvas.toDataURL('image/jpeg');
		coordsData = JSON.stringify(coordsList)

    	$.ajax({
    		type: "GET",
    		//url: "https://comp158.cs.unc.edu:8080/capture",
            url: "https://localhost:3000/save",
    		data: {
    			imgBase64: dataURL,
    			coordsData: coordsData,
    		}, 
			success: function(){
                    // Thank You
					alert('Your results have been sent and it safe to close this window. Thank you for your time.')
        	}, error: function(exception){
    			console.log("Capture Exception: " + exception);
    		}
    	});

	}
	
	function thresholdFeatureDetect(){
		clearTimeout(featureDetectTimeout)
		featureDetectTimeout = setTimeout(function(){
            trackButton.disabled = true;
		}, 300);
	}
	 
	function timeOutSendTrackData(){
		clearTimeout(sendTrackDataTimeout)
		sendTrackDataTimeout = setTimeout(function(){
			sendTrackDataToServer();
		}, 3000);
	}

	function download(){
		//saveContext.clearRect(0,0,saveCanvas.width, saveCanvas.height);
	    //saveContext.drawImage(saveVideo,0,0,saveCanvas.width,saveCanvas.height);
	    var dataURL = saveCanvas.toDataURL('image/jpeg');
	    this.href = dataURL;
	    saveContext.drawImage(canvas,0,0,saveCanvas.width,saveCanvas.height);

	    saveData(coordsList, "coords.json");       

	}

	var saveData = (function () {
		var a = document.createElement("a");
		document.body.appendChild(a);
		a.style = "display: none";
	
		return function (data, fileName) {
	    	var json = JSON.stringify(data),
	        blob = new Blob([json], {type: "octet/stream"}),
	        url = window.URL.createObjectURL(blob);
	    	a.href = url;
	    	a.download = fileName;
	    	a.click();
	    	window.URL.revokeObjectURL(url);
		};
	}());

	// var gui = new dat.GUI();
	// gui.add(tracker, 'edgesDensity', 0.1, 0.5).step(0.01).listen();
	// gui.add(tracker, 'initialScale', 1.0, 10.0).step(0.1).listen();
	// gui.add(tracker, 'stepSize', 1, 5).step(0.1).listen();

};
