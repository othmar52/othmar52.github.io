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
 * @todo: provide a downloadable .html for offline usage
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
    this.initSettings();

    if(this.opts.hotSpot.showMerged === true) {
        document.querySelector(this.domSelectors.hotspotsContainer).appendChild(this.getChannelHotspotDom("all"));
        this.inputs["all"] = {
            visible: true,
            activityScore: 0
        }
        this.recalculateInputActivity().reorderHotspotRows();
    }
    
};


