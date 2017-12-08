/**
 * @class ClockInput
 * @author othmar52 <othmar52@users.noreply.github.com>
 * @static
 *
 */
function ClockInput() {
    this.id = "";
    this.name = "";
    this.found = false;
}

/**
 * @class NoteInput
 * @static
 *
 */
function NoteInput(conf) {
    conf = (conf) || {};
    this.id = "";
    this.name = "";
    this.found = false;
    this.channel = 1;
    this.color = "grey";
    this.label = "input";
    for(var key in conf){
        if(conf.hasOwnProperty(key) === true) {
            this[key] = conf[key] ;
            console.log("sygdxcbfh", key, conf[key]);
        }
    }
    return this;
}

/**
 * @class BlazingConfig
 * @static
 *
 */
function BlazingConfig() {
    var sum = new NoteInput();
    sum.label = "sum";
    this.noteInputs = [];
    this.noteInputs.all = sum;
    this.clockInputs = [];
    this.show = {
        time: true,
        tempo: true,
        piano: true,
        hotSpots: true,
        progress16bars: true,
        progress4bars: true,
        countDown: true
    };
    this.hotSpot = {
        resolution: 24, // [clock ticks] (24 = 1/4 bar)
        observationPeriod: 4, // [bars]
        showMerged: true, // hotspot row with sum of all channels
        maxChannelRows: 5,
        lifeTime: 40, // [seconds]
        ignoreChannel10: true // default MIDI channel for drums
        // TODO: add smth like "only show hotspots for configured BlazingConfig.noteInputs and
        // ignore incoming note events that are not explicitly configured"
    };
    this.time = {
        totalTimeWarning: 15*60, // [seconds]
        stopStartTreshold: 3000 // [miliseconds]
    };
    this.hideCursorAfter = 10; // [seconds]
    this.noSleep = true;  // disable screensaver on incoming clock
    this.bar16changeAnnounce = "and"; // last part of huge count down
}

/**
 * adds input with adressable key to configuration
 * 
 * @method addInput
 * @static
 * @chainable
 * 
 * @return {BlazingConfig} Returns the `BlazingConfig` object so methods can be chained.
 */
BlazingConfig.prototype.addInput = function(noteInput) {
    this.noteInputs["i" + noteInput.id + "-" + noteInput.channel] = noteInput;
    this.noteInputs["i" + noteInput.id + "-" + noteInput.channel] = noteInput;
    return this;
};
