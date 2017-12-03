
/**
 * @method checkTempoRefresh
 * @static
 * @chainable
 *
 * some background info for MIDI clock standard
 *      24 PPQN (pulses per quarter note).
 *      Pulse Length = 60/(BPM * PPQN)
 *
 * @return {BlazingBaton} Returns the `BlazingBaton` object so methods can be chained.
 */
BlazingBaton.prototype.checkTempoRefresh = function(){
    if(this.status.real.clockEventsCounter !== this.bpmCalculateDelay) {
        return;
    }
    var timeDeltaSinceStart = Date.now() - this.status.real.lastCounterReset;
    var pulseLength = (timeDeltaSinceStart)/this.status.real.clockEventsCounter;

    var bpm = 60/(pulseLength*24)*1000;
    this.status.real.clockEventsCounter = 0;
    this.status.real.lastCounterReset = Date.now();
    bpm = (bpm < 0 || bpm > 999) ? 0 : Math.round(bpm).toFixed(0);
    document.querySelector(this.domSelectors.bpm).innerHTML = bpm;
    return this;
};
