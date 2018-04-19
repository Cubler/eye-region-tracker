$(document).ready(() => {

    trialToPerimPercent = {
        "1": 0.7,
        "2": 1.0,
        "3": 0.5,
    }

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
   
    $('#cancelTrack').click(function() {
        CONTROLLER.cancelButtonMethod();
    });

    $('#getEdges').click(()=>{
        DISPLAY.showEdges();
    });

    $('#getEdgeMetric').click(()=>{
        MODEL.getEdgeMetric();
    });

    $('#collectData').click(()=>{
        window.location.href='#animationCanvas'
        trial = document.getElementById("trialNum").value
        pp = trialToPerimPercent[trial]
        CONTROLLER.collectData(pp);
    });

    $(window).resize(function(){
        DISPLAY.resizeCanvas();
    });

    // Modal code adapted from https://www.w3schools.com/howto/howto_css_modal_images.asp
    var modal = document.getElementById('myModal');
    var img = document.getElementById('myImg');
    var modalImg = document.getElementById("img01");
    var captionText = document.getElementById("caption");

    $('.thumbnail').click((event)=>{
        modal.style.display = "block";
        modalImg.src = event.target.src;
        captionText.innerHTML = event.target.alt;
    });
    $('.close').click(()=>{
        modal.style.display = "none";
    });

});
