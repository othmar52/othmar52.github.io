/**
 *
 * @method handleMultiStop
 * @static
 * @chainable
 *
 * @return {BlazingBaton} Returns the `BlazingBaton` object so methods can be chained.
 */
BlazingBaton.prototype.handleMultiStop = function() {
    if(this.status.multiStop.resetterFirst === 0) {
        this.status.multiStop.resetterFirst = Date.now();
        this.status.multiStop.resetterCount = 1;
        return;
    }
    if(this.status.multiStop.resetterFirst + this.status.multiStop.resetterTreshold < this.status.real.lastStop) {
        this.status.multiStop.resetterFirst = Date.now();
        this.status.multiStop.resetterCount = 1;
        return;
    }
    this.status.multiStop.resetterCount++;
    if(this.status.multiStop.resetterCount !== 3) {
        return;
    }
    this.status.fake.playing = false;
    this.noSleep.disable();
    this.status.fake.active = false;
    this.resetTime();
    return this;
};
