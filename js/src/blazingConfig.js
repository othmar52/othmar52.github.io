/**
 * @class ClockInput
 * @author othmar52 <othmar52@users.noreply.github.com>
 * @static
 *
 */
function ClockInput(conf) {
    conf = (conf) || {};
    this.id = "";
    this.name = "";
    this.found = false;
    for(var key in conf){
        if(conf.hasOwnProperty(key) === true) {
            this[key] = conf[key] ;
        }
    }
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
        }
    }
    return this;
}

/**
 * @class ChannelNotesInput
 * 
 * @static
 *
 */
function ChannelNotesInput(conf) {
    conf = (conf) || {};
    this.id = "";
    this.name = "";
    this.found = false;
    this.channel = 1;
    this.color = "red";
    this.genericLabel = "INP %INP% CH %CHAN%";
    this.ignoreChannels = [10];
    this.channelOverrides = [];
    for(var key in conf){
        if(conf.hasOwnProperty(key) === true) {
            this[key] = conf[key] ;
        }
    }
    return this;
}

/**
 * @class OmniChannelNotesInput
 * used for MPE supported MIDI controllers which uses all 16 channels
 * @static
 *
 */
function OmniChannelNotesInput(conf) {
    conf = (conf) || {};
    this.id = "";
    this.name = "";
    this.found = false;
    this.color = "red";
    this.label = "INP %INP%";
    this.ignoreChannels = [];
    for(var key in conf){
        if(conf.hasOwnProperty(key) === true) {
            this[key] = conf[key] ;
        }
    }
    return this;
}

/**
 * @class NoteEventTarget
 * represents a separate row with color and label
 * this row may get note events from multiple channels defined in channel mapping 
 * @static
 *
 */
function NoteEventTarget(conf) {
    conf = (conf) || {};
    this.id = "";
    this.color = "grey";
    this.label = "input";
    this.omni = false;
    for(var key in conf){
        if(conf.hasOwnProperty(key) === true) {
            this[key] = conf[key] ;
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
    this.noteInputs = [];
    this.noteInputs.all = new NoteInput({label: "sum"});
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
    this.hideCursorAfter = 3; // [seconds]
    this.noSleep = true;  // disable screensaver on incoming clock
    this.bar16changeAnnounce = "and"; // last part of huge count down
    this.stuckNotesRemoval = 20; // [seconds] delete stuck notes. set to zero to not delete stuck notes
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
BlazingConfig.prototype.addInput = function(midiInput) {
    //console.log(midiInput.constructor.name);
    switch(midiInput.constructor.name) {
        case "NoteInput":
            this.noteInputs["i" + midiInput.id + "-" + midiInput.channel] = midiInput;
            break;
        case "ClockInput":
            this.clockInputs["i" + midiInput.id] = midiInput;
            break;
        case "ChannelNotesInput":
            for(var _channel=1; _channel <=16; _channel++) {
                if(this.useChannel(midiInput, _channel) === false) {
                    // skip blacklisted channel
                    continue;
                }

                // TODO: add generic label or color in case it is not configured
                var _label = midiInput.genericLabel.replace("%CHAN%", _channel);
                var _color = midiInput.color;
                for(var _channelOverrideIdx = 0; _channelOverrideIdx < midiInput.channelOverrides.length; _channelOverrideIdx++) {
                    if(midiInput.channelOverrides[_channelOverrideIdx].channel === _channel) {
                        _label = midiInput.channelOverrides[_channelOverrideIdx].label;
                        _color = midiInput.channelOverrides[_channelOverrideIdx].color;
                        break;
                    }
                }
                var noteInput = new NoteInput({
                    label: _label,
                    color: _color,
                    name: midiInput.name,
                    id: midiInput.id,
                    channel: _channel
                });
                this.noteInputs["i" + midiInput.id + "-" + _channel] = noteInput;
            }
            break;
        case "OmniChannelNotesInput":

            // TODO: add generic label or color in case it is not configured
            var _label = midiInput.label;
            var _color = midiInput.color;
            var noteInput = new NoteInput({
                label: _label,
                color: _color,
                name: midiInput.name,
                id: midiInput.id,
                channel: "omni"
            });
            this.noteInputs["i" + midiInput.id + "-omni"] = noteInput;
            break;
        default:
            console.log("invalid input");
            break;
    }
    return this;
};


BlazingConfig.prototype.useChannel = function(midiInput, channel) {
    for(var _ignoreChannelIdx = 0; _ignoreChannelIdx < midiInput.ignoreChannels.length; _ignoreChannelIdx++) {
        if(channel === midiInput.ignoreChannels[_ignoreChannelIdx]) {
            return false;
        }
    }
    return true;
};

