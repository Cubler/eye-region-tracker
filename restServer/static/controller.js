// CONTROLLER handles user input and procedures/logic for provided components such as simonSays


let CONTROLLER = {

	// Length of the debouncer sequence needed for the confirm decision
    confirmLength: 5,

    // Array used to buffer the estimated quadrants when 
    // determining if predictions have been consistent.
    debouncerArray: [],

    // The number of consistent quadrants for the debouncer
    debouncerLength: 2,

    debug: true,

    isCanceled: false,

    // The change in score for a miss and a hit respectively 
    missPoints: -5,
    hitPoints: 10,

    // the number of getRequests per getCenter request
    numPtsPerCenter: 10,

	// The path for the no-save coordinates request
    realTimeURL: "/getCoordsFast",

    saveRequestURL: "/dataCollect",
    saveSubPathURL: "/start",

    saveSubPath: null,

	// The server URL to send requests to
	serverURL: "https://localhost:3000",


    cancelButtonMethod: () => {
        CONTROLLER.isCanceled = true;
    },

    // Preforms a one time request to get and show coordinates from the server.
    capture: () => {
        MODEL.userSequence = [];
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
            let newQuadrant = MODEL.coordsToQuadrant(coords);
            DISPLAY.showFeedback(newQuadrant);
        });
    },

	captureAtPoint: (point, perimeterPercent) => {
		let maxCaptures = 3;
		let numCaptures = 0;
		return new Promise((resolve, reject)=> {
			let captureTimeout = setInterval(()=>{
				if(numCaptures < maxCaptures){
					numCaptures += 1;
					let [leftAvg, rightAvg] = MODEL.getEdgeMetric();
					let features = JSON.parse(TRACKER.getFormatFaceFeatures());
    				features['leftEyeMetric'] = parseFloat(leftAvg).toFixed(2);
    				features['rightEyeMetric'] = parseFloat(rightAvg).toFixed(2);
    				let featuresString = JSON.stringify(features);
					let method = "GET";
			        let url = CONTROLLER.serverURL + CONTROLLER.saveRequestURL;
			        let data = {
			            imgBase64: DISPLAY.getPicToDataURL(),
			            faceFeatures: featuresString,
			            currentPosition: point,
			            saveSubPath: CONTROLLER.saveSubPath,
			            perimeterPercent: perimeterPercent,
			        };

			        CONTROLLER.getRequest(method, url, data).then((coords) => {
			        });
			    }else{
			    	clearTimeout(captureTimeout);
			    	resolve();
			    }
			}, 500);
		});
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

	collectData: () => {
		let currentPoint = -1;
		let revCounter = 0; 
		let perimeterPercent = parseFloat(document.getElementById('perimeterPercent').value)/10;
		CONTROLLER.setSaveSubPath().then(()=>{
			CONTROLLER._collectData(currentPoint, revCounter, perimeterPercent);
		});
	},

	_collectData: (currentPoint, revCounter, perimeterPercent) => {
		let previousPoint = currentPoint % 5
		currentPoint = (currentPoint +1) % 5;
		revCounter += 1;
		if(revCounter > (3*5)){
			// End
			alert("Done");
		}else{
			DISPLAY.transitionRecPoint(previousPoint, currentPoint, perimeterPercent).then(()=>{
				CONTROLLER.captureAtPoint(currentPoint, perimeterPercent).then(()=>{
					CONTROLLER._collectData(currentPoint, revCounter, perimeterPercent);
				});
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
    	[leftAvg, rightAvg] = MODEL.getEdgeMetric();
    	let dataURL = DISPLAY.getPicToDataURL();
    	source.href = dataURL;
    	let features = JSON.parse(TRACKER.getFormatFaceFeatures());
    	features['leftEyeMetric'] = parseFloat(leftAvg).toFixed(2);
    	features['rightEyeMetric'] = parseFloat(rightAvg).toFixed(2);
    	CONTROLLER.downloadFeatures(features, "faceFeatures.json");
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

        CONTROLLER.getRequest(method, url, data).then((coords) => {
            let newQuadrant = MODEL.coordsToQuadrant(coords);
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
        }, (error) => {
            console.log(error);
        });
    },

    getCenter: () => {
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
		    		if(i < CONTROLLER.numPtsPerCenter){
		    			let method = "GET";
				        let url = CONTROLLER.serverURL + CONTROLLER.realTimeURL;
				        let data = {
				            imgBase64: DISPLAY.getPicToDataURL(),
				            faceFeatures: TRACKER.getFormatFaceFeatures(),
				            currentPosition: null,
				            saveSubPath: null,
				        };

				        CONTROLLER.getRequest(method, url, data).then((coords) => {
				        	MODEL.centerList.push(MODEL.parseCoords(coords));
				        });
				        i++;
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
            let newQuadrant = MODEL.coordsToLeftRight(coords);
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
        MODEL.setNewSequence(maxSeqLen);
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

    // Starts a new UserFeedback session for a given round.
    getUserFeedbackCoords: (round = -1) => {
        MODEL.userSequence = [];
        CONTROLLER.clearDebouncer();
        CONTROLLER.debouncerLength = 2;
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

        CONTROLLER.getRequest(method, url, data).then((coords) => {
            let newQuadrant = MODEL.coordsToQuadrant(coords);
            let debouncedQuadrant = CONTROLLER.debounce(newQuadrant);
            
            if(debouncedQuadrant == -1){
           		// Noisy feedback. Continue getting feedback.
           		CONTROLLER._getUserFeedbackCoords(round, true);

           	}else{
	            if(lastQuadrant != debouncedQuadrant){
	               	// If there hasn't been a feedback from a user yet (since lastQuadrant =-1) or 
	               	// if the returned quadrant is different from the current quadrant

	                MODEL.userSequence.push(debouncedQuadrant);
	                DISPLAY.showFeedback(debouncedQuadrant);

	                if(MODEL.isSequenceMatching(MODEL.sequence, MODEL.userSequence)){
	                   	// (Hit) New quadrant is the correct next quadrant in the sequence
	                   	MODEL.updateScore(CONTROLLER.hitPoints);

	                    if(MODEL.sequence.length != 0 && MODEL.userSequence.length == round){
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
	                	MODEL.userSequence.pop();


	                	if(MODEL.userSequence.length == 0 || 
							debouncedQuadrant != MODEL.userSequence[MODEL.userSequence.length-1]){	
	                		// The current loop is a transition to a new, incorrect, quadrant 
	                		// (ignoring a transition to the most recent correct quadrant) and 
	                		// therefore a new miss.
                			MODEL.updateScore(CONTROLLER.missPoints);
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
        }, (error) => {
            console.log(error);
        });

    },

    // Handle either finishing the game if all rounds are complete or continuing to next round.
    // Event.round = round that was completed
    roundCompleteHandler: (event) => {
    	let round = event.detail+1;

    	if(round <= MODEL.sequence.length){
		    DISPLAY.showComment("Next Sequence").then(() => {
		    	DISPLAY.showSequence(MODEL.sequence.slice(0,round)).then(() => {
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
				resolve();
			});
		});
	},

    setup: () => {
    	window.addEventListener('roundComplete', CONTROLLER.roundCompleteHandler);
    	window.addEventListener('decision', CONTROLLER.decisionHandler);

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
        CONTROLLER.debouncerLength = 4;
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
        let maxSeqLen = parseInt(document.getElementById("sequenceLength").value);
        MODEL.setNewSequence(maxSeqLen);
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
