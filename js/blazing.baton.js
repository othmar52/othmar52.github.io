/**
 * @class BlazingBaton
 * @author othmar52 <othmar52@users.noreply.github.com>
 * @static
 *
 * @todo: create a web worker for the WebMidi events
 *
 * @todo: check if stucked notes are a problem and implement some cleaunUp
 *
 * @todo: find a graphic designer for GUI improvements
 * 
 */
function BlazingBaton(userOptions) {
    var defaultOptions = {
        inputNames: {
            clock: [],
            notes: []
        },
        inputCustomization: {
            "all": {
                color: "grey",
                label: "Sum"
            }
        },
        hotSpot: {
            resolution: 24, // [clock ticks] (24 = 1/4 bar)
            observationPeriod: 4, // [bar]
            showMerged: true, // hotspot row with sum of all channels
            maxChannelRows: 5,
            lifeTime: 40, // [seconds]
            ignoreChannel10: true // default MIDI channel for drums
        },
        time: {
            totalTimeWarning: 15*60, // [seconds]
            stopStartTreshold: 3000 // [miliseconds]
        },
        hideCursorAfter: 3000, // [miliseconds]
        noSleep: true,  // disable screensaver on incoming clock
        bar16changeAnnounce: "and" // last part of huge count down
    };
    
    // merge default options with customized options
    this.opts = this.mergeDeep(defaultOptions, userOptions);

    this.fakeClockInterval = 21;

    // TODO: choose random colors for unconfigured note events
    this.colors = ["grey", "pink", "cyan", "violet", "red", "orange", "green", "blue", "yellow"];

    // TODO: remove this as soon as we have a graphic decision
    // shy | shy2
    this.tempShyClass = "shy";


    this.status = {
        real: {
            playing: false,
            lastStart: 0,
            lastStop: 0,
            lastCounterReset: 0,
            clockEventsCounter: 0,
            bpm: 0
        },
        fake: {
            active: false,
            playing: false,
            lastStart: 0,
            bpm: 0
        },
        // recieving 3 stop events within status.multiStop.resetterTreshold will
        // reset timer ignoring opts.time.stopStartTreshold
        multiStop: {
            resetterCount: 0,
            resetterTreshold: 1000, // [miliseconds]
            resetterFirst: 0
        }
    };
    
    this.hotSpot = {
        tickCounter: 0,
        ticksPerSegment: 0,
        segment: {
            current: 1,
            max: 0
        }
    };

    this.bar4Counter = 0;
    this.bar16Counter = 0;

    this.bar4MaxClockEvents = 24*16;
    this.bar16MaxClockEvents = 24*64;

    // there is no need to calculate bpm on each clock event
    // recalculate bpm after bpmCalculateDelay clock-events
    this.bpmCalculateDelay = 30;
    this.checkTimeInterval = null;

    this.keys = ["C", "CS", "D", "DS", "E", "F", "FS", "G", "GS", "A", "AS", "B"];

    this.openNotes = [];
    this.notesHistory = [];

    this.noSleep = null;

    this.domSelectors = {
        bpm: "#bpm-value",
        time: "#time",
        bigOverlay: "#big-overlay",

        progBar4: "#innerProgBar4",
        progBar16: "#innerProgBar16",

        fakeEvents: "#fake-events",
        fakeStart: "#fake-start",
        fakeStop: "#fake-stop",
        fakeNoteOn: ".fake-noteon",
        fakeNoteOff: ".fake-noteoff",

        hotspotsContainer: "#hotspots-container"
    };

    // helper vars for hiding mousecursor on idle
    this.mouseTimer = null;
    this.cursorVisible = true;

    this.inputs = [];
    
    this.freeInputSlot = true;
    this.init();
}



/**
 * Simple object check.
 * @param item
 * @returns {boolean}
 */
BlazingBaton.prototype.isObject = function(item) {
  return (item && typeof item === "object" && !Array.isArray(item));
}

/**
 * Deep merge two objects.
 * @param target
 * @param ...sources
 */

BlazingBaton.prototype.mergeDeep = function(target, ...sources) {
  if (!sources.length) return target;
  const source = sources.shift();

  if (this.isObject(target) && this.isObject(source)) {
    for (const key in source) {
      if (this.isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        this.mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return this.mergeDeep(target, ...sources);
}



BlazingBaton.prototype.init = function() {
    var that = this;
    this.checkTimeInterval = setInterval(this.checkTime.bind(this), 100);
    // TODO: remove? this.redrawHotspotRows();
    
    this.webMidi = window.WebMidi;
    this.noSleep = new NoSleep();

    this.webMidi.enable(function (err) {
        if(err) {
            that.notify("Your device does not support webMidi", 1511767451);
            return;
        }
        that.opts.inputNames.clock.forEach(function(inputName){
            var input = that.webMidi.getInputByName(inputName);
            if(input === false) {
                that.notify("Configured input '"+ inputName +"' not found", 1511767884);
                return;
            }
            input.addListener(
                "start", "all", function(event) { that.handleEventMidiStart(event); }
            );
            input.addListener(
                "stop", "all", function(event) { that.handleEventMidiStop(event); }
            );
            input.addListener(
                "clock", "all", function(event) { that.handleEventMidiClock(event); }
            );
        });
        that.opts.inputNames.notes.forEach(function(inputName){
            var input = that.webMidi.getInputByName(inputName);
            if(input === false) {
                that.notify("Configured input '"+ inputName +"' not found", 1511767885);
                return;
            }
            input.addListener(
                "noteon", "all", function(event) { that.handleEventMidiNoteOn(event); }
            );
            input.addListener(
                "noteoff", "all", function(event) { that.handleEventMidiNoteOff(event); }
            );
        });
    });

    // complete hotSpot tracking configuration
    this.opts.hotSpot.observationPeriod = this.opts.hotSpot.observationPeriod * 96; // convert bars to clock ticks
    this.hotSpot.ticksPerSegment = this.opts.hotSpot.resolution;
    this.hotSpot.segment.max = this.opts.hotSpot.observationPeriod / this.opts.hotSpot.resolution;

    this.initIdleBehaviour();
    this.initDemo();

    if(this.opts.hotSpot.showMerged === true) {
        document.querySelector(this.domSelectors.hotspotsContainer).appendChild(this.getChannelHotspotDom("all"));
        this.inputs["all"] = {
            visible: true,
            activityScore: 0
        }
        this.recalculateInputActivity().reorderHotspotRows();
    }
    
};

/**
 * invokes a function call to hide mouse cursor
 * and creates an eventlistener to show it again
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
            that.mouseTimer = window.setTimeout(that.hideMouseCursor.bind(that), that.opts.hideCursorAfter);
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


BlazingBaton.prototype.notify = function(message, errorId) {
    console.log(message);
    return;
};

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

    this.handleMultiStop();

    this.status.real.clockEventsCounter = 0;
    this.status.real.lastCounterReset = Date.now();
    this.hotSpot.tickCounter = 0;
    this.bar4Counter = 0;
    this.bar16Counter = 0;

    document.querySelector(this.domSelectors.progBar4).style.width = "0";
    document.querySelector(this.domSelectors.progBar16).style.width = "0";
};

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
};


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

BlazingBaton.prototype.handleEventMidiClock = function(event) {
    if(this.status.real.playing === false) {
        return;
    }

    this.hotSpot.tickCounter++;
    this.bar4Counter++;
    this.bar16Counter++;
    this.status.real.clockEventsCounter++;
    this.checkBigCountDown();

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

    // TODO: replace with css transition
    var bar4Percent = this.bar4Counter*(100/this.bar4MaxClockEvents);
    document.querySelector(this.domSelectors.progBar4).style.width = bar4Percent+"%";

    var bar16Percent = this.bar16Counter*(100/this.bar16MaxClockEvents);
    document.querySelector(this.domSelectors.progBar16).style.width = bar16Percent+"%";


    this.checkTempoRefresh();

};

/**
 * @method checkTime
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

BlazingBaton.prototype.handleEventMidiNoteOn = function(event) {
    if(typeof event.note.octave === "undefined") {
        // for some reason one of my devices permanently fires a noteoff with undefined octave
        return;
    }
    if(this.opts.hotSpot.ignoreChannel10 === true && event.channel === 10) {
        // skip drum channel
        return;
    }
    // avoid special char in js objects. also the DOM class attributes shouldn't have the hash character
    event.note.name = event.note.name.replace("#", "S");

    // TODO: what to do if we already have this note open ?
    this.openNotes.push({
        id: event.target.id + "-" + event.channel,
        input: event.target.id,
        channel: event.channel,
        note: event.note.name,
        type: "on",
        segment: this.hotSpot.segment.current,
        start: Date.now(),
        stop: null,
        playtime: null
    });
    this.ensureHotspotRowExists(event.target.id + "-" + event.channel);
    this.checkPianoHighlight();
};

BlazingBaton.prototype.handleEventMidiNoteOff = function(event) {

    if(typeof event.note.octave === "undefined") {
        // for some reason one of my devices permanently fires a noteoff with undefined octave
        return;
    }
    if(this.opts.hotSpot.ignoreChannel10 === true && event.channel === 10) {
        // skip drum channel
        return;
    }
    // avoid special char in js objects
    event.note.name = event.note.name.replace("#", "S");

    // transfer correspondending open note to history
    var i = this.openNotes.length;

    while(i--) {
        if(this.openNotes[i].note !== event.note.name) {
            continue;
        }
        if(this.openNotes[i].id !== event.target.id + "-" + event.channel) {
            continue;
        }
        var keyToTransfer = this.openNotes.splice(i, 1);
        keyToTransfer[0].stop = Date.now();
        keyToTransfer[0].playtime = Date.now() - keyToTransfer[0].start;
        this.notesHistory.push(keyToTransfer[0]);
        break;
    }
    this.checkPianoHighlight();
};

/**
 * this function "closes" (modifies) all open notes and migrates the
 * open note objects to played notes history object
 * additionaly the total time check is invoked
 * 
 * @method handleSegmentChange
 * @static
 * @chainable
 * 
 * @return {BlazingBaton} Returns the `BlazingBaton` object so methods can be chained.
 */
BlazingBaton.prototype.handleSegmentChange = function() {
    var i = this.openNotes.length;
    var microTime = Date.now();

    
    while(i--) {
        // create new historyEntry
        this.notesHistory.push({
            id: this.openNotes[i].id,
            input: this.openNotes[i].input,
            channel: this.openNotes[i].channel,
            note: this.openNotes[i].note,
            type: this.openNotes[i].type,
            segment: this.openNotes[i].segment,
            start: this.openNotes[i].start,
            stop: microTime,
            playtime: microTime - this.openNotes[i].start
        });
        // update openNoteEntry
        this.openNotes[i].type = "hold";
        this.openNotes[i].start = microTime;
        this.openNotes[i].segment = this.hotSpot.segment.current;
    }
    this.refreshHotspots().checkTotalTime();
    return this;
}




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

/**
 * this function highlights all keys that have correspondending open notes
 *
 * @return {BlazingBaton} Returns the `BlazingBaton` object so methods can be chained.
 */
BlazingBaton.prototype.checkPianoHighlight = function() {
    for(var i = 0; i < this.keys.length; i++) {
        var action = (this.isAnyNoteOnFor(this.keys[i], "all")) ? "add" : "remove";
        document.querySelector('li[data-keyname="'+this.keys[i] +'"]').classList[action]("active");
    }

    for (var inputId in this.inputs){
        if (this.inputs.hasOwnProperty(inputId) === false) {
            continue;
        }
        if(inputId === "all") {
            continue;
        }
        if(this.inputs[inputId].visible === false) {
            // console.log("skipping pianoHighlight for invisible input " + inputId);
            continue;
        }
        for(var i = 0; i < this.keys.length; i++) {
            var action = (this.isAnyNoteOnFor(this.keys[i], inputId) === true)
                ? "add"
                : "remove";
            document.querySelector(
                '#hotspots-'+inputId+' li[data-keyname="'+this.keys[i] +'"]'
            ).classList[action]("active");
        }
    }
    return this;
};


/**
 * checks tf we have open notes by iterating over the openNotes object
 * 
 * @method isAnyNoteOnFor
 * @static
 *
 * @param noteName {String} the name of the note in upperkey letters like "C" or "CS"
 * @param inputId {String} The unique input identifier "<midiInput>-<midiChannel>|all"
 *
 * @return {Boolean} Boolean value indicating whether or not the note is currently
 * waiting for a noteOff event
 */
BlazingBaton.prototype.isAnyNoteOnFor = function(noteName, inputId) {
    var i = this.openNotes.length;
    while(i--) {
        if(this.openNotes[i].note !== noteName) {
            continue;
        }
        if(inputId === "all") {
            return true;
        }
        if(inputId === this.openNotes[i].id) {
            return true;
        }
    }
    return false;
};


/**
 * this function processes all played and stored notes
 * and calculates the activity for all inputs
 * 
 * @method recalculateInputActivity
 * @static
 * @chainable
 *
 * @param newInputId {String} The unique input identifier "<midiInput>-<midiChannel>|all"
 * newly created hotSpotRows has zero activity. to avoid immediate hiding of newly attached rows
 * a tiny bit of activity score is added once
 *
 * @return {BlazingBaton} Returns the `BlazingBaton` object so methods can be chained.
 */
BlazingBaton.prototype.recalculateInputActivity = function(newInputId) {
    for (var inputId in this.inputs){
        if (this.inputs.hasOwnProperty(inputId) === false) {
            continue;
        }
        this.inputs[inputId].activityScore = (inputId === newInputId) ? 0.1 : 0;
        var i = this.notesHistory.length;
        while(i--) {
            if(this.notesHistory[i].id !== inputId) {
                continue;
            }
            this.inputs[inputId].activityScore += this.notesHistory[i].playtime;
        }
    }
    return this;
};

/**
 * move most active input to top
 * hide hotSpot rows that exceeds opts.hotSpot.maxChannelRows
 * 
 * @method reorderHotspotRows
 * @static
 * @chainable
 * 
 * @TODO: refactoring the ugly activity sorting
 * 
 * @return {BlazingBaton} Returns the `BlazingBaton` object so methods can be chained.
 */
BlazingBaton.prototype.reorderHotspotRows = function() {

    // sort by property activityScore
    var sorted = [];
    for (var inputId in this.inputs) {
        if(inputId === "all") {
            continue;
        }
        sorted.push([inputId, this.inputs[inputId].activityScore]);
    }

    sorted.sort(function(a, b) {
        return a[1] - b[1];
    });

    var sortIndex = sorted.length;
    this.freeInputSlot = true;
    var visibleSlots = 0;
    while(sortIndex--) {
        var inputId = sorted[sortIndex][0];
        var domElement = document.querySelector("#hotspots-"+inputId);
        domElement.style.order = visibleSlots+1; // possible input "all" occupies "order:1"

        var hideInput = false;
        // hide due to inactivity?
        if(inputId !== "all" && this.inputs[inputId].activityScore === 0) {
            hideInput = true;
        }

        // hide because reached max allowed rows?
        if(visibleSlots === this.opts.hotSpot.maxChannelRows) {
            hideInput = true;
            this.freeInputSlot = false;
        }

        if(hideInput === true) {
            domElement.classList.add("hidden");
            this.inputs[inputId].visible = false;
            continue;
        }
        // unhide 
        this.inputs[inputId].visible = true;
        domElement.classList.remove("hidden");
        visibleSlots++;
    }
    return this;
};


/**
 * creates a DOM node with hot spots for input and creates a correspondending entry
 * in property "inputs". So there will be no need to query the DOM when doing input
 * related stuff
 *
 * @method ensureHotspotRowExists
 * @static
 * @chainable
 * 
 * @return {BlazingBaton} Returns the `BlazingBaton` object so methods can be chained.
 */
BlazingBaton.prototype.ensureHotspotRowExists = function(inputId) {
    try {
        if(this.inputs[inputId].visible === false && this.freeInputSlot === true) {
            this.inputs[inputId].visible = true;
            document.querySelector("#hotspots-"+inputId).classList.remove("hidden");
        }
    } catch(err) {
        // create a DOM node and append it to the container
        document.querySelector(this.domSelectors.hotspotsContainer).appendChild(
            this.getChannelHotspotDom(inputId)
        );
        // create a correspondending entry in property "inputs"
        // so there will be no need to parse the DOM when doing inputs related stuff 
        this.inputs[inputId] = {
            visible: false,
            activityScore: 0.1
        }
        this.recalculateInputActivity(inputId).reorderHotspotRows();
    }
    return this;
};


/**
 * this function invokes the highlighting of all hotspot rows that are currently
 * visible
 * 
 * @method refreshHotspots
 * @static
 * @chainable
 * 
 * @return {BlazingBaton} Returns the `BlazingBaton` object so methods can be chained.
 */
BlazingBaton.prototype.refreshHotspots = function() {
    if(this.opts.hotSpot.showMerged === true) {
        this.refreshHotspotsForInput("all");
    }

    for (var inputId in this.inputs){
        if (this.inputs.hasOwnProperty(inputId) === false) {
            continue;
        }
        if(this.inputs[inputId].visible === false) {
            //console.log("skipping refreshHotspots() for invisible input " + inputId);
            continue;
        }
        this.refreshHotspotsForInput(inputId);
    }
    return this;
};

/**
 * this function (un)highlights each note within a hotspot row
 * 
 * @method refreshHotspotsForInput
 * @static
 * @chainable
 * 
 * @param inputId {String} The unique input identifier "<midiInput>-<midiChannel>|all"
 */
BlazingBaton.prototype.refreshHotspotsForInput = function(inputId) {
    var score = {
        total: 0,
        top: 0
    };
    for(var i = 0; i < this.keys.length; i++) {
        var keyScore = this.getScoreForNote(this.keys[i], inputId);
        if(keyScore === 0) {
            continue;
        }
        score.total += keyScore;
        score.top = (keyScore > score.top) ? keyScore : score.top;
        score[ this.keys[i] ] = keyScore;
    }

    // assign percent for each not score
    var percentMap = this.convertKeyScoresToPercent(score);

    for(var i = 0; i < this.keys.length; i++) {
        var hotSpot = document.querySelector('#hotspots-'+ inputId +' li[data-keyname="'+this.keys[i] +'"] div');
        if (percentMap[ this.keys[i] ] < 0.1) {
            hotSpot.style.opacity = 0.05;
            continue;
        }
        hotSpot.style.opacity = percentMap[ this.keys[i] ]/100;
    }
    return this;
};

/**
 * scoring for different notes within a hotspot row is visualized by brightness
 * for css alpha property we need percentages instead of the meaningless collected activity score values
 * 
 * @TODO: maybe it makes more sense to pass separate arguments instead of object?
 * 
 * @param {Object} score holds values that are needed to calculate percentage
 *                       { total: int, top: int, <keyname>: int }
 */
BlazingBaton.prototype.convertKeyScoresToPercent = function(score){
    var percentMap = {};
    var i = this.keys.length;
    while(i--) {
        if (typeof score[ this.keys[i] ] === "undefined") {
            percentMap[ this.keys[i] ] = 0;
            continue;
        }
        percentMap[ this.keys[i] ] = score[ this.keys[i] ] / (score.total/100);
    }
    return percentMap;
};



BlazingBaton.prototype.getScoreForNote = function(noteName, inputId){
    // for now keep it simple and return only the playtime
    var score = 0;
    var i = this.notesHistory.length;
    while(i--) {
        if(this.notesHistory[i].note !== noteName) {
            continue;
        }
        if(this.notesHistory[i].segment !== this.hotSpot.segment.current) {
            continue;
        }
        if(inputId !== "all" && this.notesHistory[i].id !== inputId) {
            continue;
        }
        score += this.notesHistory[i].playtime;
    }
    return score;
};


/**
 * this functions removes outdated note events from all collected notes
 *
 * @method cleanUpNotesHistory
 * @static
 * @chainable
 * 
 * @return {BlazingBaton} Returns the `BlazingBaton` object so methods can be chained.
 */
BlazingBaton.prototype.cleanUpNotesHistory = function(age){
    if(age === 0) {
        this.notesHistory = [];
        return this;
    }
    var deleteBelow = Date.now() - age*1000;
    var i = this.notesHistory.length;
    while(i--) {
        if(this.notesHistory[i].start > deleteBelow) {
            continue;
        }
        this.notesHistory.splice(i, 1);
    }
    return this;
};



/**
 * create DOM elements for piano
 *
 * @method getChannelHotspotDom
 * @static
 * @chainable
 *
 * @param inputId {String} The unique input identifier "<midiInput>-<midiChannel>|all"
 *
 * @return {domElement} the ul with all its key li's
 */
BlazingBaton.prototype.getChannelHotspotDom = function(inputId) {
    var keyConf = {
        C: "white", CS: "black",
        D: "white", DS: "black",
        E: "white",
        F: "white", FS: "black",
        G: "white", GS: "black",
        A: "white", AS: "black",
        B: "white"
    };

    var label = inputId;
    var colorClass = this.opts.inputCustomization.all.color;
    if(typeof this.opts.inputCustomization[inputId] !== "undefined") {
        label = this.opts.inputCustomization[inputId].label;
        colorClass = this.opts.inputCustomization[inputId].color;
    }

    var ul = document.createElement("ul");
    ul.id = "hotspots-"+ inputId;
    ul.classList.add("simplepiano", this.tempShyClass, colorClass);
    ul.setAttribute("title", label);
    for (var key in keyConf) {
        var li = document.createElement("li");
        li.classList.add(key, keyConf[key]);
        li.setAttribute("data-keyname", key);
        li.appendChild(document.createElement("div"));
        ul.appendChild(li);
    }
    return ul;
};


/**
 * add click listeners to demo buttons for fake clock and a few notes
 * this generates fake midi events without the need for any midi hardware
 *
 * @method initDemo
 * @static
 * @chainable
 *
 * @return {BlazingBaton} Returns the `BlazingBaton` object so methods can be chained.
 */
BlazingBaton.prototype.initDemo = function() {
    document.querySelector(this.domSelectors.fakeEvents).style.display = "block";
    var fakeClock;
    var that = this;
    function seedFakeClock() {
        that.handleEventMidiClock({timestamp: Math.floor(Date.now() / 1000)});
    }
    document.querySelector(this.domSelectors.fakeStart).addEventListener("click", function(event) {
        that.handleEventMidiStart({timestamp: Math.floor(Date.now() / 1000)});
        fakeClock = setInterval(seedFakeClock, that.fakeClockInterval);
        
    });
    document.querySelector(this.domSelectors.fakeStop).addEventListener("click", function(event) {
        that.handleEventMidiStop({timestamp: Math.floor(Date.now() / 1000)});
        clearInterval(fakeClock);
    });

    var fakeNoteOn = document.querySelectorAll(this.domSelectors.fakeNoteOn);
    for (var i = 0; i < fakeNoteOn.length; i++) {
        fakeNoteOn[i].addEventListener("click", function(event) {
            that.handleEventMidiNoteOn({
                timestamp: Math.floor(Date.now() / 1000),
                target: {
                    id: this.dataset.inputid
                },
                channel: this.dataset.channel,
                note: {
                    name: this.dataset.note,
                    octave: 3,
                    number: 22
                }
            });
        });
    }

    var fakeNoteOff = document.querySelectorAll(this.domSelectors.fakeNoteOff);
    for (var i = 0; i < fakeNoteOff.length; i++) {
        fakeNoteOff[i].addEventListener("click", function(event) {
            that.handleEventMidiNoteOff({
                timestamp: Math.floor(Date.now() / 1000),
                target: {
                    id: this.dataset.inputid
                },
                channel: this.dataset.channel,
                note: {
                    name: this.dataset.note,
                    octave: 3,
                    number: 22
                }
            });
        });
    }
    return this;
};
