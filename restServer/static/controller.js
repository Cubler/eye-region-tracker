let CONTROLLER = {

	serverURL: "https://localhost:3000",
    realTimeURL: "/getCoordsFast",
    isLoopInput: false,
    missPoints: -5,
    hitPoints: 10,
    HIT: 1,
    MISS: 0,



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

    getUserFeedbackCoords: (round = -1) => {
        MODEL.userSequence = [];
        
    	CONTROLLER._getUserFeedbackCoords(round, true, -1);


    },

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
                MODEL.userSequence.push(quadrant);
                DISPLAY.showFeedback(quadrant);

                if(MODEL.isSequenceMatching(MODEL.sequence, MODEL.userSequence)){
                   	// Correct quadrant (Hit)
                   	MODEL.updateScore(CONTROLLER.hitPoints);

                    if(MODEL.sequence.length != 0 && MODEL.userSequence.length == round){
                        // Round Complete, trigger event
                        setTimeout(()=> {
                        	DISPLAY.showComment("Round Complete!").then(() => {
	                        	CONTROLLER.triggerRoundComplete(round);
                        	});
                        },500);
                        
                    }else {
                        // Matching so far, keep getting input
                        if(isLoopInput){
                            CONTROLLER._getUserFeedbackCoords(round, true);
                        }
                    }
                }else{
                	// Incorrect quadrant (Miss)
                	MODEL.userSequence.pop();

                	if(lastQuadrant != -1){
                		// Have missed before
                		if(lastQuadrant != quadrant){
                			// This is a new miss quadrant
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

    getNewSequence: () => {
        let maxSeqLen = parseInt(document.getElementById("sequenceLength").value);
        MODEL.setNewSequence(maxSeqLen);
    },

    startSimonSays: () => {
        let maxSeqLen = parseInt(document.getElementById("sequenceLength").value);
        MODEL.setNewSequence(maxSeqLen);
        CONTROLLER.triggerRoundComplete(0);
    },


    // Handle either finishing the game if all rounds 
    // are complete or continuing to next round.
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
