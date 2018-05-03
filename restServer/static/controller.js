// CONTROLLER handles user input and procedures/logic for provided components such as simonSays


let CONTROLLER = {

	// Length of the debouncer sequence needed for the confirm decision
    confirmLength: 5,
    feedbackDebounceLength: 5,
    aSDebounceLen: 5,

    // Array used to buffer the estimated quadrants when 
    // determining if predictions have been consistent.
    debouncerArray: [],

    // The number of consistent quadrants for the debouncer
    debouncerLength: 2,

    debug: true,

    eps: 0.00001,

    isCanceled: false,
    isDone: false,
    isRingLight: 0,
    useDLMODEL: true,
    DLMODELFeedbackDelay: 300,

    // The change in score for a miss and a hit respectively 
    missPoints: -5,
    hitPoints: 10,

    // the number of getRequests per getCenter request
    numPtsPerCenter: 10,

	// The path for the no-save coordinates request
    realTimeURL: "/getCoordsFast",

    saveRequestURL: "/dataCollect",
    analyzeRequestURL: "/analyzeData",
    saveSubPathURL: "/start",
    getTrialStatsURL: "/getTrialStats",
    contrastMetricURL: "/getContrastMetric",
    predictionPlotURL: "/getPredictionPlot",

    cancelDataCollectURL: "/cancelDataCollect",

    saveSubPath: null,
    saveFullSubPath: null,
    saveRoundNum: 0,

	// The server URL to send requests to
//	serverURL: "https://localhost:3000",
    serverURL: "https://comp158.cs.unc.edu:8080",

    cancelButtonMethod: () => {
        CONTROLLER.isCanceled = true;
        CONTROLLER.exitFullScreen();
    },

    cancelDataCollectRequest: () => {
        let method = "GET";
        let url = CONTROLLER.serverURL + CONTROLLER.cancelDataCollectURL;
        let data = {
            saveFullSubPath: CONTROLLER.saveFullSubPath,
            saveSubPath: CONTROLLER.saveSubPath,
            saveRoundNum: CONTROLLER.saveRoundNum.toString(),
        };
        CONTROLLER.getRequest(method, url, data);
    },

    // Preforms a one time request to get and show coordinates from the server.
    capture: () => {
        UTIL.userSequence = [];
        CONTROLLER.isCanceled = false;
        let method = "GET";
        let url = CONTROLLER.serverURL + CONTROLLER.realTimeURL;
        let data = {
            imgBase64: DISPLAY.getPicToDataURL(),
            faceFeatures: TRACKER.getFormatFaceFeatures(),
            currentPosition: null,
            saveSubPath: null,
        };

        CONTROLLER.getRequest(method, url, data).then((coords) => {
            let newQuadrant = UTIL.coordsToQuadrant(coords);
            DISPLAY.showFeedback(newQuadrant);
        });
    },

	captureAtPoint: (point, perimeterPercent) => {
        let method = "GET";
        let url = CONTROLLER.serverURL + CONTROLLER.saveRequestURL;
               
        if(parseInt(point)-point == 0){
            let numCaptures = 0;
            let maxCaptures = 3;
            let waitTime = 500;
            return new Promise((resolve, reject)=> {
                let captureTimeout = setInterval(()=>{
                    if(numCaptures < maxCaptures){
                        numCaptures += 1;
                        let data = CONTROLLER.getSaveData(point, perimeterPercent);
                        CONTROLLER.getRequest(method, url, data).then((coords) => {
                            if(CONTROLLER.isCanceled){
                                CONTROLLER.cancelDataCollectRequest();
                                clearTimeout(captureTimeout);
                                resolve()
                                return;
                            }
                            if(CONTROLLER.isDone){
                                DISPLAY.showTrialStats();
                                CONTROLLER.getPredictionPlot();
                            }
                        });
                    }else{
                        clearTimeout(captureTimeout);
                        resolve();
                    }
                }, waitTime);
            });
        }else{
            return new Promise((resolve, reject) => {
                let data = CONTROLLER.getSaveData(point, perimeterPercent);
                CONTROLLER.getRequest(method, url, data).then(() => {
                    if(CONTROLLER.isCanceled){
                        CONTROLLER.cancelDataCollectRequest();
                    }
                });
                resolve()
            });
        }
	},

    captureAtPointWithDL: (point, perimeterPercent) => {
        let method = "GET";
        let url = CONTROLLER.serverURL + CONTROLLER.analyzeRequestURL;
        if(parseInt(point)-point == 0){
            let numCaptures = 0;
            let maxCaptures = 3;
            let waitTime = 500;
            return new Promise((resolve, reject)=> {
                let captureTimeout = setInterval(()=>{
                    if(numCaptures < maxCaptures){
                        numCaptures += 1;
                        CONTROLLER.getAnalyzeData(point, perimeterPercent).then((data)=>{
                            CONTROLLER.getRequest(method, url, data).then((coords) => {
                                if(CONTROLLER.isCanceled){
                                    CONTROLLER.cancelDataCollectRequest();
                                    clearTimeout(captureTimeout);
                                    resolve()
                                    return;
                                }
                                if(CONTROLLER.isDone){
                                    DISPLAY.showTrialStats();
                                    CONTROLLER.getPredictionPlot();
                                }
                            });
                        });
                    }else{
                        clearTimeout(captureTimeout);
                        resolve();
                    }
                }, waitTime);
            });
        }else{
            return new Promise((resolve, reject) => {
                resolve()
            });
        }
    },

    checkConsistent: (quadrant) =>{
    	if(CONTROLLER.debouncerArray.length == 0){
    		throw "debouncerArray has no length. Should not have been called yet."
    	}else{
    		return quadrant == CONTROLLER.debouncerArray[CONTROLLER.debouncerArray.length-1];
    	}
    },

    clearDebouncer: () => {
    	CONTROLLER.debouncerArray = [];
    },

	collectData: (perimeterPercent = 0.7) => {
		// CONTROLLER.isRingLight = confirm("Are you using a ring light?");
        CONTROLLER.isCanceled = false;
        CONTROLLER.isDone = false;
		let currentPoint = -1;
		let revCounter = 0;

        UTIL.contrastMetrics = null;    
        let isFullScreenConfirm = confirm("I'd like to go fullscreen please")
        if(isFullScreenConfirm){
            CONTROLLER.requestFullScreen(document.documentElement);
        } 

        DISPLAY.drawRectPoint(0,perimeterPercent);
        setTimeout(() => {
            if(CONTROLLER.saveSubPath == null){
                CONTROLLER.setSaveSubPath().then(()=>{
                    CONTROLLER._collectData(currentPoint, revCounter, perimeterPercent);
                });
            }else{
                CONTROLLER.incrementFullSubPath();
                CONTROLLER._collectData(currentPoint, revCounter, perimeterPercent);
            }
        },500);
	},

	_collectData: (currentPoint, revCounter, perimeterPercent) => {
		let numOfRev = 3;
        let numOfInterSteps = 20;
        let numOfInterPics = 10;
        let stepSize = 1 / numOfInterSteps;
        let picStep = 1 / numOfInterPics;
        let previousPoint = currentPoint

        if(currentPoint == -1){
            currentPoint = -1 * stepSize
        } 

		currentPoint = (Math.round(((currentPoint + stepSize) % 5)*100)/100);
        
		if(currentPoint - CONTROLLER.eps < 0) {
            revCounter += 1;
        } 

        if(CONTROLLER.isCanceled){
            CONTROLLER.cancelDataCollectRequest();
            return;
        }

		if(revCounter > numOfRev){
			// End
            CONTROLLER.isDone = true;
			alert("This trial is done!");
            CONTROLLER.exitFullScreen();
            DISPLAY.showTrialStats();
            CONTROLLER.getPredictionPlot();
		}else{

            let newStep = new Promise((resolve, reject) =>{
                DISPLAY.drawRectPoint(currentPoint, perimeterPercent)
                setTimeout(() => {
                    resolve();
                },75);
            });

            newStep.then(()=>{
                if((currentPoint * Math.round(1/CONTROLLER.eps) % picStep) / Math.round(1/CONTROLLER.eps) - CONTROLLER.eps < 0){
                    if(CONTROLLER.useDLMODEL && false){
                        CONTROLLER.captureAtPointWithDL(currentPoint, perimeterPercent).then(()=>{
                            CONTROLLER._collectData(currentPoint, revCounter, perimeterPercent);
                        });
                    }else {
                        CONTROLLER.captureAtPoint(currentPoint, perimeterPercent).then(()=>{
                            CONTROLLER._collectData(currentPoint, revCounter, perimeterPercent);
                        });
                    }    
                }else {
                    CONTROLLER._collectData(currentPoint, revCounter, perimeterPercent);
                }
			});
		}
	},

    // Denoises random inaccurate estimates by requiring debouncerLength number of
    // constant readings before allowing a change in the state.
    // Returns the corresponding consistent quadrant or -1 if not consistent 
    debounce: (newQuadrant) => {
    	if(CONTROLLER.debouncerArray.length == 0){
    		CONTROLLER.debouncerArray.push(newQuadrant);
    		return newQuadrant;
    	}
    	if(CONTROLLER.debouncerArray.length < (CONTROLLER.debouncerLength)){
    		// Not enough data to determine consistency
    		CONTROLLER.debouncerArray.push(newQuadrant);
    		return -1;
    	}else{
			CONTROLLER.debouncerArray = CONTROLLER.shiftArray(CONTROLLER.debouncerArray, -1);
    		CONTROLLER.debouncerArray.push(newQuadrant);
    		if(CONTROLLER.debouncerArray.every(CONTROLLER.checkConsistent)){
    			return newQuadrant;
    		}else{
    			// Noisy Array
    			return -1;
    		}
    	}
    },

    decisionHandler: (event) => {
    	if(event.detail == 1){
    		DISPLAY.showFullColor("#00FF00");
    	}else if(event.detail == 2){
    		DISPLAY.showFullColor("#FF0000");
    	}
    },

    downloadPhoto: (source) => {
    	[leftAvg, rightAvg] = UTIL.getEdgeMetric();
    	let dataURL = DISPLAY.getPicToDataURL();
    	source.href = dataURL;
    	let features = JSON.parse(TRACKER.getFormatFaceFeatures());
    	features['leftEyeMetric'] = parseFloat(leftAvg).toFixed(2);
    	features['rightEyeMetric'] = parseFloat(rightAvg).toFixed(2);
    	CONTROLLER.downloadFeatures(features, "faceFeatures.json");
    },

    exitFullScreen: () => {
         if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    },

    getActionFeedback: (lastQuadrant = -1) =>{
    	let method = "GET";
        let url = CONTROLLER.serverURL + CONTROLLER.realTimeURL;
        let data = {
            imgBase64: DISPLAY.getPicToDataURL(),
            faceFeatures: TRACKER.getFormatFaceFeatures(),
            currentPosition: null,
            saveSubPath: null,
        };
        if(CONTROLLER.isCanceled){
        	return;
        }

        if(CONTROLLER.useDLMODEL){
            var wait = new Promise((resolve,reject) => {
                var coords = DLMODEL.getCoords()
                setTimeout(()=>{
                    resolve(coords);
                },CONTROLLER.DLMODELFeedbackDelay)
            });
            wait.then((coords)=>{
                CONTROLLER.getActionFeedbackHandler(coords, lastQuadrant);
            });
            
        }else {

            CONTROLLER.getRequest(method, url, data).then((coords) => {
                CONTROLLER.getActionFeedbackHandler(coords);
            }, (error) => {
                console.log(error);
            });
        }
    },

    getActionFeedbackHandler: (coords, lastQuadrant) => {
        let newQuadrant = UTIL.coordsToQuadrant(coords);
        let debouncedQuadrant = CONTROLLER.debounce(newQuadrant);
        if(debouncedQuadrant == -1){
            // Noisy feedback. Continue getting feedback.
            DISPLAY.drawActionPics();
            DISPLAY.showDebounceProgress();
            CONTROLLER.getActionFeedback();
        }else{
            if(lastQuadrant != debouncedQuadrant){
                // If there hasn't been a feedback from a user yet (since lastQuadrant =-1) or 
                // if the returned quadrant is different from the current quadrant
                DISPLAY.selectAction(debouncedQuadrant);
                CONTROLLER.getActionFeedback(debouncedQuadrant);
                
            }else{
                // Current quadrant is the same as the most recent quadrant
                CONTROLLER.getActionFeedback(debouncedQuadrant);
            }
        }
        if(CONTROLLER.debug){
            let today = new Date();
            let h = today.getHours();
            let m = today.getMinutes();
            let s = today.getSeconds();
            console.log("Time: " + h + ":" + m + ":" + s + 
                " Coords: " + coords +
                " newQuadrant: " + newQuadrant + 
                " debouncedQuadrant: " + debouncedQuadrant);
        }
    },

    getCenter: () => {
        UTIL.centerList = [];
    	DISPLAY.showComment("Look at the center point please",1000).then(()=>{
    		DISPLAY.drawRectPoint(0);
    		CONTROLLER.getCenterRequests().then(() => {
    			DISPLAY.showComment("All Done Finding Center");
    		});
    	});
    },

    getCenterRequests: () => {
    	return new Promise((resolve,reject) =>{
    		let i = 0;
    		setTimeout(()=>{
	    		getCenterTimeout = setInterval(()=>{
		    		if(i++ < CONTROLLER.numPtsPerCenter){
		    			if(CONTROLLER.useDLMODEL){
                            var wait = new Promise((resolve,reject) => {
                                var coords = DLMODEL.getCoords()
                                setTimeout(()=>{
                                    resolve(coords);
                                },CONTROLLER.DLMODELFeedbackDelay)
                            });
                            wait.then((coords)=>{
                                UTIL.centerList.push(UTIL.parseCoords(coords));                            });
                        }else {

                            let method = "GET";
    				        let url = CONTROLLER.serverURL + CONTROLLER.realTimeURL;
    				        let data = {
    				            imgBase64: DISPLAY.getPicToDataURL(),
    				            faceFeatures: TRACKER.getFormatFaceFeatures(),
    				            currentPosition: null,
    				            saveSubPath: null,
    				        };

    				        CONTROLLER.getRequest(method, url, data).then((coords) => {
    				         	UTIL.centerList.push(UTIL.parseCoords(coords));
    				        });
                        }
		    		}else{
		    			clearTimeout(getCenterTimeout);
		    			resolve();
		    		}
		    	}, 500);
	    	},1000);
    	});
    },

    getConfirm: () => {
    	DISPLAY.drawConfirm();
    	CONTROLLER.clearDebouncer();
    	CONTROLLER.debouncerLength = CONTROLLER.confirmLength;
        CONTROLLER.isCanceled = false;
        CONTROLLER._getConfirm();
    },

    _getConfirm: () =>{
    	DISPLAY.drawConfirm();

    	let method = "GET";
        let url = CONTROLLER.serverURL + CONTROLLER.realTimeURL;
        let data = {
            imgBase64: DISPLAY.getPicToDataURL(),
            faceFeatures: TRACKER.getFormatFaceFeatures(),
            currentPosition: null,
            saveSubPath: null,
        };
        if(CONTROLLER.isCanceled){
        	return;
        }

        CONTROLLER.getRequest(method, url, data).then((coords) => {
            let newQuadrant = UTIL.coordsToLeftRight(coords);
            let debouncedQuadrant = CONTROLLER.debounce(newQuadrant);
            
            if(CONTROLLER.debouncerArray.length < CONTROLLER.confirmLength || debouncedQuadrant == -1){
           		// Noisy feedback. Continue getting feedback.
           		CONTROLLER._getConfirm();
           	}else {
				CONTROLLER.triggerDecision(debouncedQuadrant);
           	}
        }, (error) => {
            console.log(error);
        });
    },

    getContrastMetric: () => {
        return new Promise ((resolve,reject) => {
            let method = "GET";
            let url = CONTROLLER.serverURL + CONTROLLER.contrastMetricURL;
            let data = CONTROLLER.getSaveData(-1, -1);
            CONTROLLER.getRequest(method, url, data).then((metrics) =>{
                metricsJSON = JSON.parse(metrics);
                let outputString = "Left Eye (HS, HFM): (" + parseFloat(metricsJSON['leftEye']['hsMetric']).toFixed(2) + ', ' + parseFloat(metricsJSON['leftEye']['hfmMetric']).toFixed(2) + ")\n" +
                  "Right Eye (HS, HFM): (" + parseFloat(metricsJSON['rightEye']['hsMetric']).toFixed(2) + ', ' + parseFloat(metricsJSON['rightEye']['hfmMetric']).toFixed(2) + ")\n" + 
                  "Face (HS, HFM): (" + parseFloat(metricsJSON['face']['hsMetric']).toFixed(2) + ', ' + parseFloat(metricsJSON['face']['hfmMetric']).toFixed(2) + ")";

                console.log("Left Eye (HS, HFM): (" + parseFloat(metricsJSON['leftEye']['hsMetric']).toFixed(2) + ', ' + parseFloat(metricsJSON['leftEye']['hfmMetric']).toFixed(2) + ")");
                console.log("Right Eye (HS, HFM): (" + parseFloat(metricsJSON['rightEye']['hsMetric']).toFixed(2) + ', ' + parseFloat(metricsJSON['rightEye']['hfmMetric']).toFixed(2) + ")");
                console.log("Face (HS, HFM): (" + parseFloat(metricsJSON['face']['hsMetric']).toFixed(2) + ', ' + parseFloat(metricsJSON['face']['hfmMetric']).toFixed(2) + ")");

                resolve(metricsJSON);
            });
        });

    },

    getDebounceProgress: (array) => {
    	let count = array.map(CONTROLLER.checkConsistent).lastIndexOf(false);
    	if(count == -1){
    		return array.length
    	}else {
    		return CONTROLLER.debouncerLength-(count+1);
    	}
    },
    // Sets a new sequence with the sequence length coming from the user input.
    getNewSequence: () => {
        let maxSeqLen = parseInt(document.getElementById("sequenceLength").value);
        UTIL.setNewSequence(maxSeqLen);
    },

    // Returns a promise for a server request.
    // method: "GET" (or potentially "POST")
    getRequest: (method, url, data) =>{
        return new Promise((resolve, reject) => {
            $.ajax({
                type: method,
                url: url,
                data: data,
                success: function(coords){
                   resolve(coords);
                }, 
                error: function(exception){
                  reject(exception);
                }
            });
        });
    },

    // Gets the plot of the estimated points for the most recent trial.
    getPredictionPlot: () => {
        return new Promise((resolve,reject) => {
            let method = "GET";
            let url = CONTROLLER.serverURL + CONTROLLER.predictionPlotURL;
            let data = {
                saveFullSubPath: CONTROLLER.saveFullSubPath,
            };
            CONTROLLER.getRequest(method, url, data).then((jsonS)=>{
                document.getElementById('predictionPlot').src = 'data:image/png;base64,' + jsonS
            });
        });
    },

    getSaveData: (point, perimeterPercent) => {
        let [leftAvg, rightAvg] = UTIL.getEdgeMetric();
        let features = JSON.parse(TRACKER.getFormatFaceFeatures());
        features['leftEyeMetric'] = parseFloat(leftAvg).toFixed(2);
        features['rightEyeMetric'] = parseFloat(rightAvg).toFixed(2);
        let featuresString = JSON.stringify(features);
        let data = {
            imgBase64: DISPLAY.getPicToDataURL(),
            faceFeatures: featuresString,
            currentPosition: point,
            saveFullSubPath: CONTROLLER.saveFullSubPath,
            perimeterPercent: perimeterPercent,
            isRingLight: document.getElementById('ringLightSetting').value,
            isFullScreen: (!window.screenTop && !window.screenY),
            aspectDim: [window.innerHeight, window.innerWidth].toString(),
        };

        return data;
    },

    // Collects the data to be sent to the server when the dlModel is being use.
    // We don't need the image anymore and we need to wait for the coords to be calculated
    getAnalyzeData: async (point, perimeterPercent) => {
        let [leftAvg, rightAvg] = UTIL.getEdgeMetric();
        let features = JSON.parse(TRACKER.getFormatFaceFeatures());
        features['leftEyeMetric'] = parseFloat(leftAvg).toFixed(2);
        features['rightEyeMetric'] = parseFloat(rightAvg).toFixed(2);
        let featuresString = JSON.stringify(features);

        if(UTIL.contrastMetrics == null){
            UTIL.contrastMetrics = JSON.stringify(await CONTROLLER.getContrastMetric())
        }
        
        let data = {
            faceFeatures: featuresString,
            currentPosition: point,
            contrastMetrics: UTIL.contrastMetrics,
            saveFullSubPath: CONTROLLER.saveFullSubPath,
            perimeterPercent: perimeterPercent,
            isRingLight: document.getElementById('ringLightSetting').value,
            isFullScreen: (!window.screenTop && !window.screenY),
            aspectDim: [window.innerHeight, window.innerWidth].toString(),
            dlCoords: DLMODEL.getCoords().toString(),
        };
        return data
    },

    getTrialStats: () => {
        return new Promise((resolve,reject) => {
            let method = "GET";
            let url = CONTROLLER.serverURL + CONTROLLER.getTrialStatsURL;
            let data = {
                saveFullSubPath: CONTROLLER.saveFullSubPath,
            };
            CONTROLLER.getRequest(method, url, data).then((jsonS)=>{
                stats = JSON.parse(jsonS.replace(/NaN/g,"\"null\""));
                resolve(stats);
            });
        });
    },

    // Starts a new UserFeedback session for a given round.
    getUserFeedbackCoords: (round = -1) => {
        UTIL.userSequence = [];
        CONTROLLER.clearDebouncer();
        CONTROLLER.debouncerLength = parseInt($('#debouncerLength').val());
        CONTROLLER.isCanceled = false;
    	CONTROLLER._getUserFeedbackCoords(round, true, -1);
    },

    // Helper function for the UserFeedback session that determines the next step in the UserFeedback session.  
    //
    // lastQuadrant: 
    // i.e. If the current correct quadrant and the next correct quadrant are 1 and 2 respectively, and the user looks at 
    // quadrant 4 instead of quadrant 2 they they will only be deducted points onces while they continue to look at quadrant 4. 
    _getUserFeedbackCoords: (round = -1, isLoopInput = false, lastQuadrant = -1) => {
        let method = "GET";
        let url = CONTROLLER.serverURL + CONTROLLER.realTimeURL;
        let data = {
            imgBase64: DISPLAY.getPicToDataURL(),
            faceFeatures: TRACKER.getFormatFaceFeatures(),
            currentPosition: null,
            saveSubPath: null,
        };
        if(CONTROLLER.isCanceled){
        	return;
        }

        if(CONTROLLER.useDLMODEL){
            var wait = new Promise((resolve,reject) => {
                var coords = DLMODEL.getCoords()
                setTimeout(()=>{
                    resolve(coords);
                },CONTROLLER.DLMODELFeedbackDelay)
            });
            wait.then((coords)=>{
                CONTROLLER.getUserFeedbackHandler(coords, round, isLoopInput, lastQuadrant);
            });
            
        }else {
            CONTROLLER.getRequest(method, url, data).then((coords) => {
                CONTROLLER.getUserFeedbackHandler(coords, round, isLoopInput, lastQuadrant);
            }, (error) => {
                console.log(error);
            });
        }

    },

    getUserFeedbackHandler: (coords, round, isLoopInput, lastQuadrant) => {
        let newQuadrant = UTIL.coordsToQuadrant(coords);
        let debouncedQuadrant = CONTROLLER.debounce(newQuadrant);
        
        if(debouncedQuadrant == -1){
            // Noisy feedback. Continue getting feedback.
            CONTROLLER._getUserFeedbackCoords(round, true);

        }else{
            if(lastQuadrant != debouncedQuadrant){
                // If there hasn't been a feedback from a user yet (since lastQuadrant =-1) or 
                // if the returned quadrant is different from the current quadrant

                UTIL.userSequence.push(debouncedQuadrant);
                DISPLAY.showFeedback(debouncedQuadrant);

                if(UTIL.isSequenceMatching(UTIL.sequence, UTIL.userSequence)){
                    // (Hit) New quadrant is the correct next quadrant in the sequence
                    UTIL.updateScore(CONTROLLER.hitPoints);

                    if(UTIL.sequence.length != 0 && UTIL.userSequence.length == round){
                        // Round Complete, trigger event
                        setTimeout(()=> {
                            DISPLAY.showComment("Round Complete!").then(() => {
                                CONTROLLER.triggerRoundComplete(round);
                            });
                        },500);
                        
                    }else {
                        // The userSequence is a partial match. Need to keep getting input
                        if(isLoopInput){
                            CONTROLLER._getUserFeedbackCoords(round, true, debouncedQuadrant);

                        }
                    }
                }else{
                    // (Miss) New quadrant is not the correct next quadrant in the sequence
                    UTIL.userSequence.pop();


                    if(UTIL.userSequence.length == 0 || 
                        debouncedQuadrant != UTIL.userSequence[UTIL.userSequence.length-1]){  
                        // The current loop is a transition to a new, incorrect, quadrant 
                        // (ignoring a transition to the most recent correct quadrant) and 
                        // therefore a new miss.
                        UTIL.updateScore(CONTROLLER.missPoints);
                    }

                    if(isLoopInput){
                        CONTROLLER._getUserFeedbackCoords(round, true, debouncedQuadrant);
                    }
                } 
            }else{
                // Current quadrant is the same as the most recent quadrant

                if(isLoopInput){
                    CONTROLLER._getUserFeedbackCoords(round, true, debouncedQuadrant);
                }
            }
        }

        if(CONTROLLER.debug){
            let today = new Date();
            let h = today.getHours();
            let m = today.getMinutes();
            let s = today.getSeconds();
            console.log("Time: " + h + ":" + m + ":" + s + 
                " Coords: " + coords +
                " newQuadrant: " + newQuadrant + 
                " debouncedQuadrant: " + debouncedQuadrant);
        }
    },

    goToAnimationCanvas: () => {
        window.location.href='#animationCanvas'
    },

    isFullScreen: () => {
        return (!window.screenTop && !window.screenY)
    },

	incrementFullSubPath: () => {
		CONTROLLER.saveRoundNum += 1;
		CONTROLLER.saveFullSubPath = CONTROLLER.saveSubPath + '/' + 
			CONTROLLER.saveRoundNum;
	},

    requestFullScreen: (element) => {
        // Supports most browsers and their versions.
        let requestMethod = element.requestFullScreen || element.webkitRequestFullScreen || element.mozRequestFullScreen || element.msRequestFullScreen;

        if (requestMethod) { // Native full screen.
            requestMethod.call(element);
        } else if (typeof window.ActiveXObject !== "undefined") { // Older IE.
            let wscript = new ActiveXObject("WScript.Shell");
            if (wscript !== null) {
                wscript.SendKeys("{F11}");
            }
        }
    },

    // Handle either finishing the game if all rounds are complete or continuing to next round.
    // Event.round = round that was completed
    roundCompleteHandler: (event) => {
    	let round = event.detail+1;

    	if(round <= UTIL.sequence.length){
		    DISPLAY.showComment("Next Sequence").then(() => {
		    	DISPLAY.showSequence(UTIL.sequence.slice(0,round)).then(() => {
		    		DISPLAY.showComment("Get Ready!").then(() => {
		    			CONTROLLER.getUserFeedbackCoords(round);
		    		});
		   		});
		   	});
    	}else {
    		DISPLAY.showFullColor("#00FF00");
    	}
    },

	setSaveSubPath: () => {
		let method = "GET";
		let url = CONTROLLER.serverURL + CONTROLLER.saveSubPathURL
		let data = {};
		
		return new Promise((resolve, reject) =>{
			CONTROLLER.getRequest(method, url, data).then((subPath) => {
				CONTROLLER.saveSubPath = subPath;
				CONTROLLER.saveRoundNum = 0;
				CONTROLLER.saveFullSubPath = CONTROLLER.saveSubPath + '/' + 
					CONTROLLER.saveRoundNum;
				resolve();
			});
		});
	},

    setup: () => {
    	window.addEventListener('roundComplete', CONTROLLER.roundCompleteHandler);
    	window.addEventListener('decision', CONTROLLER.decisionHandler);
        $(document).on('webkitfullscreenchange mozfullscreenchange fullscreenchange', function(e){
            CONTROLLER.goToAnimationCanvas();
        });
        CONTROLLER.serverURL = window.location.href.substring(0,window.location.href.indexOf(window.location.pathname));

    	CONTROLLER.downloadFeatures = (function() {
	    	let a = document.createElement("a");
	    	document.body.appendChild(a);
	    	a.style = "display: none";

	    	return (data, fileName) => {
		    	let json = JSON.stringify(data),
		        blob = new Blob([json], {type: "octet/stream"}),
		        url = window.URL.createObjectURL(blob);
		    	a.href = url;
		    	a.download = fileName;
		    	a.click();
		    	window.URL.revokeObjectURL(url);
			};
	    }());
    },

    // Shifts the array by the shift amount. Negative numbers mean
    // shift left. e.g. array = [1,2,3,4], shiftAmount = -1
    // returned: shiftedArray=[2,3,4]
    shiftArray: (array, shiftAmount) => {
    	shiftedArray = [];
    	for(let i=0; i < (array.length-Math.abs(shiftAmount)); i++){
    		shiftedArray.push(array[i-shiftAmount]);
    	}
    	return shiftedArray
    },

    startActionSelect: () => {
        DISPLAY.drawActionPics();
        CONTROLLER.clearDebouncer();
        CONTROLLER.debouncerLength = CONTROLLER.aSDebounceLen;
        CONTROLLER.isCanceled = false;
        CONTROLLER.getActionFeedback(-1);
    },

	startTracking: () => {
		TRACKER.trackingTask.run();
	},

	stopTracking: () => {
		TRACKER.trackingTask.stop();
	},

    // Called when the user decides to start the game. Starts a new SimonSays game
    startSimonSays: () => {
        UTIL.clearScore();
        let maxSeqLen = parseInt(document.getElementById("sequenceLength").value);
        UTIL.setNewSequence(maxSeqLen);
        CONTROLLER.triggerRoundComplete(0);
    },

    // Creates a custom Event that encapsulates the round that was just completed 
    // and dispatches that event.
    triggerRoundComplete: (round) => {
    	let event = new CustomEvent('roundComplete', {
    		detail: round,
    	});
    	window.dispatchEvent(event);
    },

    triggerDecision: (quadrant) => {
		let event = new CustomEvent('decision', {
    		detail: quadrant,
    	});
    	window.dispatchEvent(event);
    },
} 

$(document).ready(() => {
    CONTROLLER.setup()
});
