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
 * @todo: optionally hide duration counter by configuration
 *
 * @todo: activate some build tool for those splitted javascript files
 *
 * @todo: provide a downloadable .html with inline js+css for offline usage
 *
 */
function BlazingBaton(userOptions) {

    // merge default options with customized options
    //this.opts = this.mergeDeep(defaultOptions, userOptions);
    this.opts = userOptions;

    this.fakeClockInterval = 21;

    // TODO: choose random colors for unconfigured note events
    this.colors = ["grey", "pink", "cyan", "violet", "red", "orange", "green", "blue", "yellow"];

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
        piano: "#piano",
        clockHint: "#clockHint",

        progBar4: "#innerProgBar4",
        progBar16: "#innerProgBar16",

        fakeEvents: "#fake-events",
        fakeStart: "#fake-start",
        fakeStop: "#fake-stop",
        fakeNoteOn: ".fake-noteon",
        fakeNoteOff: ".fake-noteoff",

        hotspotsContainer: "#hotspots-container",

        settings: "#settings",
        toggleSettings: "#toggle-settings",
        inputConfig: "#input-config"
    };

    // visibility of some elements
    // instead of querying the DOM store state in this helper object
    this.guiStatus = {
        settings: false
    }

    // helper vars for hiding mousecursor on idle
    this.mouseTimer = null;
    this.cursorVisible = true;

    this.inputs = [];

    this.freeInputSlot = true;
    this.init();
}



BlazingBaton.prototype.init = function() {
    var that = this;
    this.checkTimeInterval = setInterval(this.checkTime.bind(this), 100);

    this.webMidi = window.WebMidi;
    this.noSleep = new NoSleep();

    this.webMidi.enable(function (err) {
        if(err) {
            that.notify("Your device does not support webMidi", 1511767451);
            return;
        }
        for(var idx in that.opts.clockInputs) {
            if (!that.opts.clockInputs.hasOwnProperty(idx)) { continue; }
            var input = that.webMidi.getInputByName(that.opts.clockInputs[idx].name);
            if(input === false) {
                that.notify("Configured input '"+ that.opts.clockInputs[idx].name +"' not found", 1511767884);
                continue;
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
        }
        for(var idx in that.opts.noteInputs) {
            if (!that.opts.noteInputs.hasOwnProperty(idx) || idx === "all") { continue; }
            var input = that.webMidi.getInputByName(that.opts.noteInputs[idx]);
            if(input === false) {
                that.notify("Configured input '"+ that.opts.noteInputs[idx].name +"' not found", 1511767885);
                continue;
            }
            input.addListener(
                "noteon", that.opts.noteInputs[idx].channel, function(event) { that.handleEventMidiNoteOn(event); }
            );
            input.addListener(
                "noteoff", that.opts.noteInputs[idx].channel, function(event) { that.handleEventMidiNoteOff(event); }
            );
        }
    });

    // complete hotSpot tracking configuration
    this.opts.hotSpot.observationPeriod = this.opts.hotSpot.observationPeriod * 96; // convert bars to clock ticks
    this.hotSpot.ticksPerSegment = this.opts.hotSpot.resolution;
    this.hotSpot.segment.max = this.opts.hotSpot.observationPeriod / this.opts.hotSpot.resolution;

    this.initIdleBehaviour();
    this.initDemo();
    this.initSettings();

    this.showProgressBar16().showProgressBar4().showPiano().showHotspots().showTime().showTempo();
};


/**
 * show gui element based on configuration
 * 
 * @method showProgressBar16
 * @static
 * @chainable
 * 
 * @return {BlazingBaton} Returns the `BlazingBaton` object so methods can be chained.
 */
BlazingBaton.prototype.showProgressBar16 = function() {
    if(this.opts.show.progress16bars === false) {
        return this;
    }
    document.querySelector(this.domSelectors.progBar16).parentNode.classList.remove("hidden");
    return this;
}

/**
 * show gui element based on configuration
 * 
 * @method showProgressBar4
 * @static
 * @chainable
 * 
 * @return {BlazingBaton} Returns the `BlazingBaton` object so methods can be chained.
 */
BlazingBaton.prototype.showProgressBar4 = function() {
    if(this.opts.show.progress4bars === false) {
        return this;
    }
    document.querySelector(this.domSelectors.progBar4).parentNode.classList.remove("hidden");
    return this;
}

/**
 * show gui element based on configuration
 * 
 * @method showPiano
 * @static
 * @chainable
 * 
 * @return {BlazingBaton} Returns the `BlazingBaton` object so methods can be chained.
 */
BlazingBaton.prototype.showPiano = function() {
    if(this.opts.show.piano === false) {
        return this;
    }
    document.querySelector(this.domSelectors.piano).classList.remove("hidden");
    return this;
}

/**
 * show gui element based on configuration
 * 
 * @method showPiano
 * @static
 * @chainable
 * 
 * @return {BlazingBaton} Returns the `BlazingBaton` object so methods can be chained.
 */
BlazingBaton.prototype.showTime = function() {
    if(this.opts.show.time === false) {
        return this;
    }
    document.querySelector(this.domSelectors.time).classList.remove("hidden");
    return this;
}

/**
 * show gui element based on configuration
 * 
 * @method showTempo
 * @static
 * @chainable
 * 
 * @return {BlazingBaton} Returns the `BlazingBaton` object so methods can be chained.
 */
BlazingBaton.prototype.showTempo = function() {
    if(this.opts.show.tempo === false) {
        return this;
    }
    document.querySelector(this.domSelectors.bpm).parentNode.classList.remove("hidden");
    return this;
}

/**
 * show gui element based on configuration
 * 
 * @method showHotspots
 * @static
 * @chainable
 * 
 * @return {BlazingBaton} Returns the `BlazingBaton` object so methods can be chained.
 */
BlazingBaton.prototype.showHotspots = function() {
    if(this.opts.show.hotSpots === false) {
        return this;
    }
    if(this.opts.hotSpot.showMerged === false) {
        return this;
    }
    document.querySelector(this.domSelectors.hotspotsContainer).appendChild(this.getChannelHotspotDom("all"));
    this.inputs["all"] = {
        visible: true,
        activityScore: 0
    }
    this.recalculateInputActivity().reorderHotspotRows();
    return this;
}

