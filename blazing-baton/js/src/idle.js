
/**
 * invokes a function call to hide mouse cursor
 * and creates an eventlistener to show it again
 *
 * @TODO: disable hiding of mouse cursor if opts.hideCursorAfter === 0
 *
 */
BlazingBaton.prototype.initIdleBehaviour = function() {
    var that = this;
    window.onload = function(){
        document.body.onmousemove = function() {
            if (that.mouseTimer) {
                window.clearTimeout(that.mouseTimer);
            }
            if (that.cursorVisible === false) {
                document.body.style.cursor = "default";
                document.querySelector(that.domSelectors.fakeEvents).style.display = "block";
                that.cursorVisible = true;
            }
            that.mouseTimer = window.setTimeout(that.hideMouseCursor.bind(that), that.opts.hideCursorAfter*1000);
        };
    };
};

/**
 * hides the mousecorser and stores this state in BlazingBaton properties
 */
BlazingBaton.prototype.hideMouseCursor = function() {
    document.body.style.cursor = "none";
    document.querySelector(this.domSelectors.fakeEvents).style.display = "none";
    this.mouseTimer = null;
    this.cursorVisible = false;
};

