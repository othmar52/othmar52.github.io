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
 * @todo: activate some build tool for those splitted javascript & css files
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
        // display rec status & time from Soundcraft ui24r mixing console
        overrideTime: {
            enable: false,
            isRecording: false,
            recTime: '00:00',
            renderedRecTime: ''
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
    this.bar64Counter = 0;

    this.bar4MaxClockEvents = 24*16;
    this.bar16MaxClockEvents = 24*64;
    this.bar64MaxClockEvents = 24*64*4;

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
        progBar64: "#innerProgBar64",

        numerator: {
            num1: "#num1",
            num2: "#num2",
            num3: "#num3"
        },

        fakeEvents: "#fake-events",
        fakeStart: "#fake-start",
        fakeStop: "#fake-stop",
        fakeNoteOn: ".fake-noteon",
        fakeNoteOff: ".fake-noteoff",

        hotspotsContainer: "#hotspots-container",

        settings: "#settings",
        toggleSettings: "#toggle-settings",
        inputConfig: "#input-config",
        addNoteInput: "#addNoteInput"
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
    
    // lookup object which holds colors labels which helps to decide if we should ignore the note event
    // for an 8 input midi device it holds 8x16 (=128) entries
    this.noteEventTargetMapping = [];

    // each entry represents a separate hotspot target row
    this.noteEventTargets = [];

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
		// hasListener() does not support anonymous function. so we have to assign it to a variable
		var listenerNoteOn = function(event) { that.handleEventMidiNoteOn(event); };
		var listenerNoteOff = function(event) { that.handleEventMidiNoteOff(event); };

        for(var idx in that.opts.noteInputs) {
            if (!that.opts.noteInputs.hasOwnProperty(idx) || idx === "all") { continue; }
            
            var noteEventTarget = new NoteEventTarget({
                id: that.opts.noteInputs[idx].id,
                color: that.opts.noteInputs[idx].color,
                label: that.opts.noteInputs[idx].label
            });
            var uniqueIdentifier = "i"+that.opts.noteInputs[idx].id + "-" + that.opts.noteInputs[idx].channel;
			
			that.noteEventTargetMapping[uniqueIdentifier] = uniqueIdentifier;
			if(that.opts.noteInputs[idx].channel === "omni") {
				noteEventTarget.omni = true;
				for(var _channel=1; _channel <=16; _channel++) {
					that.noteEventTargetMapping["i"+that.opts.noteInputs[idx].id + "-" + _channel] = uniqueIdentifier;
				}
			}
			that.noteEventTargets[uniqueIdentifier] = noteEventTarget;
            
            var input = that.webMidi.getInputByName(that.opts.noteInputs[idx].name);

            if(input === false) {
                that.notify("Configured input '"+ that.opts.noteInputs[idx].name +"' not found", 1511767885);
                continue;
            }
            if(input.hasListener("noteon", ["all"], listenerNoteOn)) {
                //console.log("all listener on this input is already attached...");
                continue;
            }
            //console.log("all listener is NOT attached...");
            //console.log("ADDING LISTENER" + that.opts.noteInputs[idx].name + " " + that.opts.noteInputs[idx].channel);
            input.addListener(
                "noteon", "all", listenerNoteOn
            );
            input.addListener(
                "noteoff", "all", listenerNoteOff
            );
        }
        //console.log(that.noteEventTargetMapping);
        //console.log(that.noteEventTargets);
    });

    // complete hotSpot tracking configuration
    this.opts.hotSpot.observationPeriod = this.opts.hotSpot.observationPeriod * 96; // convert bars to clock ticks
    this.hotSpot.ticksPerSegment = this.opts.hotSpot.resolution;
    this.hotSpot.segment.max = this.opts.hotSpot.observationPeriod / this.opts.hotSpot.resolution;

    this.initIdleBehaviour();
    this.initDemo();
    this.initSettings();

    this.showProgressBar64().showProgressBar16().showProgressBar4().showPiano().showHotspots().showTime().showTempo();

    // optionally get rec status & rec time from external
    if (window.parent === window.self) {
        // no embedded frame
        return
    }
    window.addEventListener(
        "message",
        (event) => {
            that.status.overrideTime.enable = true
            that.status.overrideTime.isRecording = event.data.rec;
            that.status.overrideTime.recTime = event.data.sec;
        }
    );
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
 * @method showProgressBar64
 * @static
 * @chainable
 * 
 * @return {BlazingBaton} Returns the `BlazingBaton` object so methods can be chained.
 */
BlazingBaton.prototype.showProgressBar64 = function() {
    if(this.opts.show.progress64bars === false) {
        return this;
    }
    document.querySelector(this.domSelectors.progBar64).parentNode.classList.remove("hidden");
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

    // temporary hack for fullPiano screen recording
    //document.querySelector("#progBar4").appendChild(this.getPianoDom());

    return this;
}

/**
 * show gui element based on configuration
 * 
 * @method showTime
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

