
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

    // nothing to do with disabled hotSpots
    if(this.opts.show.hotSpots === false) {
        return this;
    }

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
    // nothing to do with disabled hotSpots
    if(this.opts.show.hotSpots === false) {
        return this;
    }
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
    // nothing to do with disabled hotSpots
    if(this.opts.show.hotSpots === false) {
        return this;
    }
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
    // nothing to do with disabled hotSpots
    if(this.opts.show.hotSpots === false) {
        return this;
    }
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
 * create DOM elements for piano
 *
 * @method getChannelHotspotDom
 * @static
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

    var label = this.opts.noteInputs.all.label;
    var colorClass = this.opts.noteInputs.all.color;
    if(typeof this.opts.noteInputs["i"+inputId] !== "undefined") {
        label = this.opts.noteInputs["i"+inputId].label;
        colorClass = this.opts.noteInputs["i"+inputId].color;
    }

    var ul = document.createElement("ul");
    ul.id = "hotspots-"+ inputId;
    ul.classList.add("simplepiano", "shypiano", colorClass);
    ul.setAttribute("title", label);
    for (var key in keyConf) {
        var li = document.createElement("li");
        li.classList.add(key, keyConf[key]);
        li.setAttribute("data-keyname", key);
        var hotness = document.createElement("div");
        hotness.classList.add("hotness")
        li.appendChild(hotness);
        var noteon = document.createElement("div");
        noteon.classList.add("noteon")
        li.appendChild(noteon);
        ul.appendChild(li);
    }
    return ul;
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
    var stuckNoteIndex = null; 
    while(i--) {
        // create new historyEntry
        this.notesHistory.push({
            id: this.openNotes[i].id,
            input: this.openNotes[i].input,
            channel: this.openNotes[i].channel,
            note: this.openNotes[i].note,
            number: this.openNotes[i].number,
            type: this.openNotes[i].type,
            segment: this.openNotes[i].segment,
            start: this.openNotes[i].start,
            stop: microTime,
            playtime: microTime - this.openNotes[i].start
        });
        // update openNoteEntry
        //console.log(microTime)
        this.openNotes[i].playtime += microTime - this.openNotes[i].start;
        
        if(this.opts.stuckNotesRemoval > 0 && this.openNotes[i].playtime > this.opts.stuckNotesRemoval*1000) {
            stuckNoteIndex = i;
        }
        this.openNotes[i].type = "hold";
        this.openNotes[i].start = microTime;
        this.openNotes[i].segment = this.hotSpot.segment.current;
    }
    if(stuckNoteIndex !== null ) {
        this.openNotes.splice(stuckNoteIndex, 1);
        this.checkPianoHighlight();
    }
    this.refreshHotspots().checkTotalTime();//.flashSegmentChange();
    return this;
}

/**
 * this method adds and removes a class
 * the css animation creates a pulsating effect on every beat
 * todo: remove hardcoded dom selector
 * currently disabled...
 * 
 * @method flashSegmentChange
 * @chainable
 * 
 * @return {BlazingBaton} Returns the `BlazingBaton` object so methods can be chained.
 */
BlazingBaton.prototype.flashSegmentChange = function() {
    document.querySelector("#pulsator").classList.add("pulsate");
    //document.querySelector(this.domSelectors.progBar16).classList.add("green");
    //var that = this;
    setTimeout(
        function(){
            document.querySelector("#pulsator").classList.remove("pulsate");
            //document.querySelector(that.domSelectors.progBar16).classList.remove("green");
        },
        100
    );
    return this;
};

/**
 * create DOM elements for piano
 *
 * @method getPianoDom
 * @static
 *
 * @return {domElement} the ul with all its key li's
 */
BlazingBaton.prototype.getPianoDom = function() {
    var keyConf = {
        C: "white", CS: "black", // black1",
        D: "white", DS: "black", // black3",
        E: "white",
        F: "white", FS: "black", // black1",
        G: "white", GS: "black", // black2",
        A: "white", AS: "black", // black3",
        B: "white"
    };

    // TODO: move to config
    let startNumber = 21;
    let keyAmount = 88;

    var ul = document.createElement("ul");
    ul.id = "fullpiano";
    ul.classList.add("simpleXpiano", "comXmon", "fullpiano", "keys");

    for(var i=startNumber; i < startNumber+keyAmount; i++) {
        var noteLetter = this.noteNumberToLetter(i);
        var li = document.createElement("li");
        li.classList.add(noteLetter, keyConf[noteLetter], "key");
        li.setAttribute("data-keyname", noteLetter);
        li.setAttribute("data-notenumber", i);
        var hotness = document.createElement("div");
        hotness.classList.add("hotness")
        li.appendChild(hotness);
        var noteon = document.createElement("div");
        noteon.classList.add("noteon")
        li.appendChild(noteon);
        ul.appendChild(li);
    }
    return ul;
};


/**
 * converts note number to letter
 * 
 * noteNumer 0 is C of octave -2
 * noteNumer 127 is G of octave 8
 *
 * @method noteNumberToLetter
 * @static
 *
 * @param noteNumber {Int} 0 - 127
 * @return {string} the letter representation of the note
 */
BlazingBaton.prototype.noteNumberToLetter = function(noteNumber) {
    var keys = ["C", "CS", "D", "DS", "E", "F", "FS", "G", "GS", "A", "AS", "B"];
    var mapping = [];
    var currentKeys = [...keys];
    for(var i = 0; i < 128; i++) {
        mapping[i] = currentKeys.shift();
        if(currentKeys.length === 0) {
            currentKeys = [...keys];
        }
        
    }
    return mapping[noteNumber];
};