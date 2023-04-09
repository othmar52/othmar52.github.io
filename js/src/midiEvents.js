
BlazingBaton.prototype.handleEventMidiStart = function(event) {
    this.status.real.playing = true;
    this.status.fake.playing = true;
    this.noSleep.enable();

    this.hotSpot.segment.current = 1;
    this.status.real.clockEventsCounter = 0;
    this.status.real.lastCounterReset = Date.now();
    this.status.real.lastStart = Date.now();
    if(this.status.fake.active === false) {
        this.status.fake.lastStart = Date.now();
    }
    this.status.fake.active = false;
    this.status.multiStop.resetterFirst = 0;
    this.status.multiStop.resetterCount = 0;
    document.querySelector(this.domSelectors.time).classList.remove("danger", "info");
    document.querySelector(this.domSelectors.clockHint).classList.add("hidden");

    // TODO: multiple start events without stop should not reset clock
    // TODO: stop event without running clock should not colorize clock

};

BlazingBaton.prototype.handleEventMidiStop = function(event) {
    // console.log("Received 'stop ' time ("  + event.timestamp  + ").");
    this.status.real.playing = false;
    this.status.real.lastStop = Date.now();
    if(this.status.fake.playing === true) {
        this.status.fake.active = true;
        document.querySelector(this.domSelectors.time).classList.add("danger");
    }
    document.querySelector(this.domSelectors.clockHint).classList.remove("hidden");

    this.handleMultiStop();

    this.status.real.clockEventsCounter = 0;
    this.status.real.lastCounterReset = Date.now();
    this.hotSpot.tickCounter = 0;
    this.bar4Counter = 0;
    this.bar16Counter = 0;
    this.bar64Counter = 0;

    document.querySelector(this.domSelectors.progBar4).style.width = "0";
    document.querySelector(this.domSelectors.progBar16).style.width = "0";
    document.querySelector(this.domSelectors.progBar64).style.width = "0";
};



BlazingBaton.prototype.handleEventMidiClock = function(event) {
    if(this.status.real.playing === false) {
        return;
    }

    this.hotSpot.tickCounter++;
    this.bar4Counter++;
    this.bar16Counter++;
    this.bar64Counter++;
    this.status.real.clockEventsCounter++;
    this.checkBigCountDown();
    this.checkNumerator();

    if(this.hotSpot.tickCounter === this.hotSpot.ticksPerSegment) {
        this.hotSpot.tickCounter = 0;
        this.hotSpot.segment.current++;
        if(this.hotSpot.segment.current > this.hotSpot.segment.max) {
            this.hotSpot.segment.current = 1;
        }
        this.handleSegmentChange();
    }
    if(this.bar4Counter === this.bar4MaxClockEvents) {
        this.bar4Counter = 0;
        this.cleanUpNotesHistory(this.opts.hotSpot.lifeTime)
            .recalculateInputActivity().reorderHotspotRows();
        
    }
    if(this.bar16Counter === this.bar16MaxClockEvents) {
        this.bar16Counter = 0;
    }
    if(this.bar64Counter === this.bar64MaxClockEvents) {
        this.bar64Counter = 0;
    }

    // TODO: replace with css transition
    var bar4Percent = this.bar4Counter*(100/this.bar4MaxClockEvents);
    document.querySelector(this.domSelectors.progBar4).style.width = bar4Percent+"%";

    var bar16Percent = this.bar16Counter*(100/this.bar16MaxClockEvents);
    document.querySelector(this.domSelectors.progBar16).style.width = bar16Percent+"%";

    var bar64Percent = this.bar64Counter*(100/this.bar64MaxClockEvents);
    document.querySelector(this.domSelectors.progBar64).style.width = bar64Percent+"%";



    // colorize bar16
    if(this.bar64Counter === (this.bar64MaxClockEvents - this.bar16MaxClockEvents) ) {
        this.toggleBar16Classes("green", "red");
    }
    if(this.bar64Counter === (this.bar64MaxClockEvents - (this.bar16MaxClockEvents/2) ) ) {
        this.toggleBar16Classes("red", "orange");
    }
    if(this.bar64Counter === 1 ) {
        this.toggleBar16Classes("orange", "green");
    }

    this.checkTempoRefresh();

};

/**
 * toggle color classes of bar16 DOM node
 *
 * @method toggleBar16Classes
 * @static
 * @chainable
 * 
 * @return {BlazingBaton} Returns the `BlazingBaton` object so methods can be chained.
 */
BlazingBaton.prototype.toggleBar16Classes = function(removeClass, addClass) {
    var bar16 = document.querySelector(this.domSelectors.progBar16);
    bar16.classList.remove(removeClass);
    bar16.classList.add(addClass);
    return this;
}

BlazingBaton.prototype.handleEventMidiNoteOn = function(event) {
    if(typeof event.note.octave === "undefined") {
        // for some reason one of my devices permanently fires a noteoff with undefined octave
        return;
    }

    // check if we have to ignore the event
    var noteTargetKey = this.noteEventTargetMapping["i"+event.target.id + "-" + event.channel];
    if(typeof noteTargetKey === "undefined") {
        return;
    }
    // make sure the event target exists
    var noteTarget = this.noteEventTargets[noteTargetKey];
    if(typeof noteTarget === "undefined") {
        return;
    }

    if(this.opts.hotSpot.ignoreChannel10 === true && event.channel === 10) {
        // skip drum channel
        return;
    }
    // avoid special char in js objects. also the DOM class attributes shouldn't have the hash character
    event.note.name = event.note.name.replace("#", "S");

    // TODO: what to do if we already have this note open ?
	var _channel = ((noteTarget.omni === true) ? "omni" : event.channel);
    this.openNotes.push({
        id: event.target.id + "-" + _channel,
        input: event.target.id,
        channel: _channel,
        note: event.note.name,
        number: event.note.number,
        type: "on",
        segment: this.hotSpot.segment.current,
        start: Date.now(),
        stop: null,
        playtime: null
    });
    this.ensureHotspotRowExists(event.target.id + "-" + _channel);
    this.checkPianoHighlight();

    // temporary hack for fullPiano screen recording
    var $fullPiano;
    if($fullPiano = this.getFullPianoKey(event.note.number)) {
        $fullPiano.classList.add("pressed");
    }
};

BlazingBaton.prototype.handleEventMidiNoteOff = function(event) {

    if(typeof event.note.octave === "undefined") {
        // for some reason one of my devices permanently fires a noteoff with undefined octave
        return;
    }

    // check if we have to ignore the event
    var noteTargetKey = this.noteEventTargetMapping["i"+event.target.id + "-" + event.channel];
    if(typeof noteTargetKey === "undefined") {
        return;
    }
    // make sure the event target exists
    var noteTarget = this.noteEventTargets[noteTargetKey];
    if(typeof noteTarget === "undefined") {
        return;
    }

    // avoid special char in js objects
    event.note.name = event.note.name.replace("#", "S");

    // transfer correspondending open note to history
    var i = this.openNotes.length;

    while(i--) {
        if(this.openNotes[i].number !== event.note.number) {
            continue;
        }
        if(this.openNotes[i].id !== event.target.id + "-" + ((noteTarget.omni === true) ? "omni" : event.channel)) {
            continue;
        }
        var keyToTransfer = this.openNotes.splice(i, 1);
        keyToTransfer[0].stop = Date.now();
        keyToTransfer[0].playtime = Date.now() - keyToTransfer[0].start;
        this.notesHistory.push(keyToTransfer[0]);
        break;
    }
    this.checkPianoHighlight();

    // temporary hack for fullPiano screen recording
    var $fullPiano;
    if($fullPiano = this.getFullPianoKey(event.note.number)) {
        $fullPiano.classList.remove("pressed");
    }
};

BlazingBaton.prototype.getFullPianoKey = function(noteNumber) {
    return document.querySelector('#fullpiano li[data-notenumber="'+ noteNumber +'"]');
};