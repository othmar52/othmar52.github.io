
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
 * Simple object check
 *
 * @method isObject
 * @static
 *
 * @param item {Object|Array}
 *
 * @return {Boolean} indicating input is of type object or not
 */
BlazingBaton.prototype.isObject = function(item) {
    return (item && typeof item === "object" && !Array.isArray(item));
}


/**
 * Deep merge two objects.
 *
 * @method mergeDeep
 * @static
 *
 * @param target {Object|Array}
 * @param item {Object|Array}
 *
 * @return {Boolean} indicating input is of type object or not
 */
BlazingBaton.prototype.mergeDeep = function(target, ...sources) {
    if (!sources.length) {
        return target;
    }
    const source = sources.shift();

    if (this.isObject(target) === false && this.isObject(source) === false) {
        return this.mergeDeep(target, ...sources);
    }
    for (const key in source) {
        if (this.isObject(source[key]) === false) {
            Object.assign(target, { [key]: source[key] });
            continue;
        }
        if (!target[key]) {
            Object.assign(target, { [key]: {} });
        }
        this.mergeDeep(target[key], source[key]);
    }

    return this.mergeDeep(target, ...sources);
}

/**
 * this functions pauses script execution
 *
 * @method sleep
 * @author https://www.phpied.com/sleep-in-javascript/
 * @static
 * @TODO: check for removal
 * @return void
 */
BlazingBaton.prototype.sleep = function(milliseconds){
    var start = new Date().getTime();
    for (var i = 0; i < 1e7; i++) {
        if ((new Date().getTime() - start) > milliseconds){
            break;
        }
    }
}


BlazingBaton.prototype.range = function(start, count) {
    return Array.apply(0, Array(count))
        .map(function (element, index) {
             return index + start;
        });
}

