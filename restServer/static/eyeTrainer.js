$(document).ready(() => {

    // Event Listeners 
    //document.getElementById('getPos').addEventListener("click", CONTROLLER.capture);
    //document.getElementById('trackButton').addEventListener("click", CONTROLLER.startSimonSays);
    //document.getElementById('getSequence').addEventListener("click", CONTROLLER.getNewSequence);
    //document.getElementById('getUserSequence').addEventListener("click", CONTROLLER.getUserFeedbackCoords);
    //document.getElementById('cancelTrack').addEventListener("click", CONTROLLER.cancelButtonMethod);
    //document.getElementById('getCenter').addEventListener("click", CONTROLLER.getCenter);

    $('#getPos').click(function() {
        CONTROLLER.capture();
    });

    $('#confirm').click(function() {
        CONTROLLER.getConfirm();
    });
   
     $('#actionSelectionButton').click(function() {
        CONTROLLER.startActionSelect();
    });

    $('#cancelTrack').click(function() {
        CONTROLLER.cancelButtonMethod();
    });

    $('#getCenter').click(function() {
        CONTROLLER.getCenter();
    });

    $('#downloadLink').click(() => {
        CONTROLLER.downloadPhoto($('#downloadLink')[0]);
    });

    $('#stopTracking').click(()=>{
        CONTROLLER.stopTracking();
    });

    $('#startTracking').click(()=>{
        CONTROLLER.startTracking();
    });

    $('#getEdges').click(()=>{
        DISPLAY.showEdges();
    });

    $('#getEdgeMetric').click(()=>{
        MODEL.getEdgeMetric();
    });

    $('#collectData').click(()=>{
        window.location.href='#animationCanvas'
        CONTROLLER.collectData();
    });

    $(window).resize(function(){
        DISPLAY.resizeCanvas();
    });

    DISPLAY.drawActionPics();


});
