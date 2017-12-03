

/**
 * @method checkTime
 * @static
 * @chainable
 * 
 * @return {BlazingBaton} Returns the `BlazingBaton` object so methods can be chained.
 */
BlazingBaton.prototype.checkTime = function(){

    if(this.status.fake.playing === false) {
        return;
    }
    // check if we have to stop timer
    if(this.status.fake.active === true) {
        var microseconds = Date.now();
        var deltaSinceLastStop = microseconds - this.status.real.lastStop;
        if(deltaSinceLastStop > this.opts.time.stopStartTreshold) {
            this.status.fake.active = false;
            this.status.fake.playing = false;
            this.noSleep.disable();
            this.resetTime();
            return;
        }
    }
    var timeDifference = Date.now() - this.status.fake.lastStart;
    document.querySelector(this.domSelectors.time).innerHTML = "" + this.formatMiliseconds(timeDifference);
    return this;
};


/**
 * this function colorizes total time GUI element in case it exceeds configured limit
 * 
 * @method checkTotalTime
 * @static
 * @chainable
 * 
 * @return {BlazingBaton} Returns the `BlazingBaton` object so methods can be chained.
 */
BlazingBaton.prototype.checkTotalTime = function(event) {
    var playTimeInSeconds = (Date.now() - this.status.fake.lastStart) / 1000;
    if(playTimeInSeconds < this.opts.time.totalTimeWarning*0.7) {
        return;
    }
    document.querySelector(this.domSelectors.time).classList.add(
        (playTimeInSeconds > this.opts.time.totalTimeWarning) ? "danger" : "info"
    );
    return this;
}

/**
 * reest time and set to default color
 * 
 * @method checkTotalTime
 * @static
 * @chainable
 * 
 * @return {BlazingBaton} Returns the `BlazingBaton` object so methods can be chained.
 */
BlazingBaton.prototype.resetTime = function(){
    document.querySelector(this.domSelectors.time).classList.remove("danger", "info");
    document.querySelector(this.domSelectors.time).innerHTML = "00:00";
    this.refreshHotspots();
    this.checkPianoHighlight();
    return this;
};

/**
 * this function converts miliseconds to time string
 *
 * @param miliseconds {Number}
 *
 * @return {String} the formatted time like "02:58"
 */
BlazingBaton.prototype.formatMiliseconds = function(miliseconds) {
    var totalSeconds = Math.floor(miliseconds/1000);
    var minutes = Math.floor(totalSeconds/60);
    var seconds = totalSeconds - minutes * 60;
    return ((minutes<10)? "0": "") + minutes + ":" + ((seconds<10)? "0": "") + seconds;
};
