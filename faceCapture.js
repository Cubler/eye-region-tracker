window.onload = function() {
	var video = document.getElementById('video');
	var saveVideo = document.getElementById('saveVideo');
	var canvas = document.getElementById('canvas');
	var context = canvas.getContext('2d');

	var videoWRatio = saveVideo.clientWidth/video.clientWidth;
	var videoHRatio = saveVideo.clientHeight/video.clientHeight;

	var saveCanvas = document.getElementById('save');
	var saveContext = saveCanvas.getContext('2d');
	var features;
	var downloadLnk = document.getElementById('downloadLnk');
	downloadLnk.addEventListener('click', download, false);
	var [lx,ly,lw,lh] = [0,0,0,0];
	var [rx,ry,rw,rh] = [0,0,0,0];
	var [fx,fy,fw,fh] = [0,0,0,0];

	var eyeBoxSide = 0;
	var faceBoxSide = 0;
	var faceArray;

	var tracker = new tracking.LandmarksTracker();
	tracker.setInitialScale(4);
	tracker.setStepSize(2);
	tracker.setEdgesDensity(0.1);

	tracking.track('#video', tracker, { camera: true });

	tracker.on('track', function(event) {

	    context.clearRect(0,0,canvas.width, canvas.height);

	    if(!event.data) return;
	    if(event.data.landmarks.length==0) return;

	    	event.data.landmarks.forEach(function(landmarks) {

	        // Left Eye
	        var leftArray = landmarks.slice(23,26);
	        var rightArray = landmarks.slice(19,22);

	        [lxc,lyc,lw,lh] = targetBoxParams(leftArray,'eye');
	        [rxc,ryc,rw,rh] = targetBoxParams(rightArray,'eye');

	        faceArray = landmarks.slice(0,15);
	        [fxc,fyc,fw,fh] = targetBoxParams(faceArray,'face');
	        faceBoxSide = Math.max(fw,fh);

	        // Draw Boxes
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

	targetBoxParams = function(pointsArray,feature){
	    //return formatted as x,y,w,h 
	    //where x,y is the top left corner of box
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
	    if(feature=='eye'){
	      w = w*3;
	      h = h*6; 
	    }
	    
	    return [xCenter,yCenter, w, h]

	  }

	function download(){
		saveContext.clearRect(0,0,saveCanvas.width, saveCanvas.height);
	    saveContext.drawImage(saveVideo,0,0,saveCanvas.width,saveCanvas.height);
	    var dataURL = saveCanvas.toDataURL('image/jpeg');
	    this.href = dataURL;
	    saveContext.drawImage(canvas,0,0,saveCanvas.width,saveCanvas.height);

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
	    saveData(features, "faceFeatures.json");       

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

	var gui = new dat.GUI();
	gui.add(tracker, 'edgesDensity', 0.1, 0.5).step(0.01).listen();
	gui.add(tracker, 'initialScale', 1.0, 10.0).step(0.1).listen();
	gui.add(tracker, 'stepSize', 1, 5).step(0.1).listen();

};