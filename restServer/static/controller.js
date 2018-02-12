// CONTROLLER handles user input and procedures/logic for provided components such as simonSays


let CONTROLLER = {

	// The server URL to send requests to
	serverURL: "https://localhost:3000",

	// The path for the no-save coordinates request
    realTimeURL: "/getCoordsFast",

    // The change in score for a miss and a hit respectively 
    missPoints: -5,
    hitPoints: 10,

    // The number of consistent quadrants for the debouncer
    debouncerLength: 2,

    // Array used to buffer the estimated quadrants when 
    // determining if predictions have been consistent.
    debouncerArray: [],

    // the number of getRequests per getCenter request
    numPtsPerCenter: 10,

    debug: true,
    isCanceled: false,

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

    // Denoises random inaccurate estimates by requiring debouncerLength number of
    // constant readings before allowing a change in the state.
    // Returns the corresponding consistent quadrant or -1 if not consistent 
    debounce: (newQuadrant) => {
    	if(CONTROLLER.debouncerArray.length == 0){
    		CONTROLLER.debouncerArray.push(newQuadrant);
    		return newQuadrant;
    	}
    	if(CONTROLLER.debouncerArray.length < (CONTROLLER.debouncerLength-1)){
    		// Not enough data to determine consistency
    		CONTROLLER.debouncerArray.push(newQuadrant);
    		return -1;
    	}else{
    		if(CONTROLLER.debouncerArray.length == CONTROLLER.debouncerLength){
    			CONTROLLER.debouncerArray = CONTROLLER.shiftArray(CONTROLLER.debouncerArray, -1);
    		}
    		CONTROLLER.debouncerArray.push(newQuadrant);
    		if(CONTROLLER.debouncerArray.every(CONTROLLER.checkConsistent)){
    			return newQuadrant;
    		}else{
    			// Noisy Array
    			return -1;
    		}
    	}

    },

    clearDebouncer: () => {
    	CONTROLLER.debouncerArray = [];
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

    checkConsistent: (quadrant) =>{
    	if(CONTROLLER.debouncerArray.length == 0){
    		throw "debouncerArray has no length. Should not have been called yet."
    	}else{
    		return quadrant == CONTROLLER.debouncerArray[0];
    	}
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


    getCenter: () => {
    	DISPLAY.showComment("Look at the center point please",1000).then(()=>{
    		DISPLAY.drawRectPoint(0);
    		CONTROLLER.getCenterRequests().then(() => {
    			DISPLAY.showComment("All Done Finding Center");
    		});
    	});
    },

    cancelButtonMethod: () => {
        CONTROLLER.isCanceled = true;
    },

    // Sets a new sequence with the sequence length coming from the user input.
    getNewSequence: () => {
        let maxSeqLen = parseInt(document.getElementById("sequenceLength").value);
        MODEL.setNewSequence(maxSeqLen);
    },

    // Called when the user decides to start the game. Starts a new SimonSays game
    startSimonSays: () => {
        let maxSeqLen = parseInt(document.getElementById("sequenceLength").value);
        MODEL.setNewSequence(maxSeqLen);
        CONTROLLER.triggerRoundComplete(0);
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
    		DISPLAY.showRoundComplete();
    	}
    },

    // Creates a custom Event that encapsulates the round that was just completed 
    // and dispatches that event.
    triggerRoundComplete: (round) => {
    	let event = new CustomEvent('roundComplete', {
    		detail: round,
    	});
    	window.dispatchEvent(event);
    },

    downloadPhoto: (source) => {
    	let dataURL = DISPLAY.getPicToDataURL();
    	source.href = dataURL;
    	CONTROLLER.downloadFeatures(TRACKER.getFormatFaceFeatures(), "faceFeatures.json");
    },
    
	stopTracking: () => {
		TRACKER.trackingTask.stop();
	},

	startTracking: () => {
		TRACKER.trackingTask.run();
	},

    setup: () => {
    	window.addEventListener('roundComplete', CONTROLLER.roundCompleteHandler);

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



} 

$(document).ready(() => {
    CONTROLLER.setup()
});
