// CONTROLLER handles user input and procedures/logic for provided components such as simonSays


let CONTROLLER = {

	// The server URL to send requests to
	serverURL: "https://localhost:3000",

	// The path for the no-save coordinates request
    realTimeURL: "/getCoordsFast",

    // The change in score for a miss and a hit respectively 
    missPoints: -5,
    hitPoints: 10,


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
        
    	CONTROLLER._getUserFeedbackCoords(round, true, -1);


    },

    // Helper function for the UserFeedback session that determines the next step in the UserFeedback session.  
    // Cases 
    _getUserFeedbackCoords: (round = -1, isLoopInput = false, lastQuadrant = -1) => {
        let method = "GET";
        let url = CONTROLLER.serverURL + CONTROLLER.realTimeURL;
        let data = {
            imgBase64: DISPLAY.getPicToDataURL(),
            faceFeatures: TRACKER.getFormatFaceFeatures(),
            currentPosition: null,
            saveSubPath: null,
        };

        CONTROLLER.getRequest(method, url, data).then((coords) => {
            let quadrant = MODEL.coordsToQuadrant(coords);


            if(MODEL.userSequence.length == 0 || MODEL.userSequence[MODEL.userSequence.length-1] != quadrant){
               	// If there hasn't been a feedback from a user yet or 
               	// if the returned quadrant is different from the current quadrant
                MODEL.userSequence.push(quadrant);
                DISPLAY.showFeedback(quadrant);

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
                            CONTROLLER._getUserFeedbackCoords(round, true);
                        }
                    }
                }else{
                	// (Miss) New quadrant is not the correct next quadrant in the sequence
                	MODEL.userSequence.pop();

                	if(lastQuadrant != -1){
                		// If there has been a miss in the current round
                		if(lastQuadrant != quadrant){
                			// There has been a new quadrant that is also a miss. 
                			MODEL.updateScore(CONTROLLER.missPoints);
                			MODEL.missedQuadrant = quadrant;
                		}
                	}
                    if(isLoopInput){
                        CONTROLLER._getUserFeedbackCoords(round, true, true);
                    }
                    // console.log("Incorrect quadrant: " + quadrant);
                }  
            }else{
            	// Quadrant is the same as the most recent, correct quadrant or
            	// there is no userSequence
                if(isLoopInput){
                    CONTROLLER._getUserFeedbackCoords(round, true);
                }
            }

        }, (error) => {
            console.log(error);
        });

    },


    // Preforms a one time request to get and show coordinates from the server.
    capture: () => {
        MODEL.userSequence = [];
        CONTROLLER._getUserFeedbackCoords(-1, false, -1);

    },


    getCenter: () => {
        console.log("GetCenter() not implemented now");
    },

    cancelButtonMethod: () => {
        CONTROLLER.isCanceled = true;
        console.log("cancelButtonMethod() not implemented now");
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

    setup: () => {
    	window.addEventListener('roundComplete', CONTROLLER.roundCompleteHandler);
    },



} 

$(document).ready(() => {
    CONTROLLER.setup()
});
