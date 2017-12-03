
/**
 * show full screen overlay used for a countdown
 * @see this.checkBigCountDown()
 */
BlazingBaton.prototype.showOverlayWith = function(content) {
    var overlay = document.querySelector(this.domSelectors.bigOverlay);
    overlay.classList.add("active");
    overlay.innerHTML = content;
};

/**
 * hide full screen overlay
 * @see this.checkBigCountDown()
 */
BlazingBaton.prototype.hideOverlay = function() {
    document.querySelector(this.domSelectors.bigOverlay).classList.remove("active");
};

/**
 * check if we are at the end of bar 16
 * and display a huge countdown before we reach bar 1 again
 */
BlazingBaton.prototype.checkBigCountDown = function() {
    if(this.bar16Counter === 1) {
        this.hideOverlay();
        return;
    }
    if(this.bar16Counter < (this.bar16MaxClockEvents - 96)) {
        return;
    }
    if(this.bar16Counter === (this.bar16MaxClockEvents - 96) ) {
        this.showOverlayWith("3");
        return;
    }
    if(this.bar16Counter === (this.bar16MaxClockEvents - 72) ) {
        this.showOverlayWith("2");
        return;
    }
    if(this.bar16Counter === (this.bar16MaxClockEvents - 48) ) {
        this.showOverlayWith("1");
        return;
    }
    if(this.bar16Counter === (this.bar16MaxClockEvents - 24) ) {
        this.showOverlayWith(this.opts.bar16changeAnnounce);
        return;
    }
};
