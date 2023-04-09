
/**
 * this function checks if configuration is useable
 * if no argument is supplied the default settings will be returned
 * 
 * @method getCurrentSettings
 * @static
 * 
 * @TODO: read from cookie or localStorage
 * @TODO: check status of all noteInputs and clockInputs
 *
 * @return {BlazingConfig} Returns the `BlazingBaton` object so methods can be chained.
 */
BlazingBaton.prototype.getCurrentSettings = function(customSettings) {

    // for now keep it simple 
    if(typeof customSettings !== "undefined") {
        return customSettings;
    }
    return new BlazingConfig();
    
};

/**
 * this function lists all javascript destected MIDI inputs
 * as a list in the settings overlay
 * 
 * @method completeSettingsWithInputs
 * @static
 * @chainable
 *
 * @return {BlazingBaton} Returns the `BlazingBaton` object so methods can be chained.
 */
BlazingBaton.prototype.initSettings = function() {

    var that = this;
    document.querySelector(this.domSelectors.toggleSettings).addEventListener("click", function(event) {
        var settingsContainer = document.querySelector(that.domSelectors.settings);
        if(that.guiStatus.settings === true) {
            settingsContainer.classList.add("hidden");
            that.guiStatus.settings = false;
        } else {
            that.completeSettingsWithInputs();
            settingsContainer.classList.remove("hidden");
            that.guiStatus.settings = true;
            
        }
    });
    
    document.querySelector(this.domSelectors.addNoteInput).addEventListener("click", function(event) {
        that.addNoteInputForm();
    });
    
};

/**
 * this function lists all destected MIDI inputs
 * as a list in the settings overlay
 * 
 * @method completeSettingsWithInputs
 * @static
 * @chainable
 *
 * @return {BlazingBaton} Returns the `BlazingBaton` object so methods can be chained.
 */
BlazingBaton.prototype.completeSettingsWithInputs = function() {
    //console.log("completeSettingsWithInputs");
    //console.log(this.opts.noteInputs);
    var ul = document.querySelector(this.domSelectors.inputConfig);
    for(var idx in this.opts.noteInputs) {
        if (!this.opts.noteInputs.hasOwnProperty(idx) || idx === "all") { continue; }
        var input = this.webMidi.getInputByName(this.opts.noteInputs[idx].name);
        this.opts.noteInputs[idx].found = true;
        if(input === false) {
            this.opts.noteInputs[idx].found = false;
        }
        ul.appendChild(this.addNoteInputForm(this.opts.noteInputs[idx]));
    }
    return this;
};



/**
 * create DOM elements for piano
 *
 * @method addNoteInputForm
 * @static
 *
 * @param input {NoteInput} The MIDI input provided by webMidi
 *
 * @return {domElement} checkboxes markup
 */
BlazingBaton.prototype.addNoteInputForm = function(noteInput) {


    //console.log(input);
    var li = document.createElement("li");

    var inputSelect = document.createElement("select");
    
    var allInputs = this.getAllMidiInputs();
    var counter = 0;
    for(var i in allInputs) {
        inputSelect[counter] = new Option(
            allInputs[i],
            i,
            false,
            ((noteInput.id === i) ? true : false)
        );
        counter++;
    }
    li.appendChild(inputSelect);

    var channels = this.range(1, 16);
    channels[16] = "all";
    var channelSelect = document.createElement("select");

    for (var i = 0;i <= channels.length - 1;i++){
        channelSelect[i] = new Option(
            "CH " + channels[i],
            channels[i],
            false,
            ((noteInput.channel === channels[i]) ? true : false)
        );
    }
    li.appendChild(channelSelect);

    var labelInput = document.createElement("input");
    labelInput.setAttribute("type", "text");
    labelInput.setAttribute("value", noteInput.label);
    li.appendChild(labelInput);

    var colorSelect = document.createElement("select");
    for (var i = 0;i <= this.colors.length - 1;i++){
        colorSelect[i] = new Option(
            this.colors[i],
            this.colors[i],
            false,
            ((noteInput.color === this.colors[i]) ? true : false)
        );
    }
    li.appendChild(colorSelect);
    
    return li;
    /*
    var checkBoxClock = document.createElement("input");
    checkBoxClock.setAttribute("type", "checkbox");
    checkBoxClock.setAttribute("checked", "checked");
    checkBoxClock.setAttribute("id", "ic-"+input.id);
    li.appendChild(checkBoxClock);

    var checkBoxNotes = document.createElement("input");
    checkBoxNotes.setAttribute("type", "checkbox");
    checkBoxNotes.setAttribute("checked", "checked");
    checkBoxNotes.setAttribute("id", "in-"+input.id);
    li.appendChild(checkBoxNotes);
    li.appendChild(document.createTextNode(input.name));

    return li;
    */
};



/**
 * this function lists all destected MIDI inputs but also configured
 * MIDI inputs that are not recognized
 * 
 * @method getAllMidiInputs
 * @static
 *
 * @return {Array} Returns an array with [ id => label ] 
 */
BlazingBaton.prototype.getAllMidiInputs = function() {
    var allInputs = [];
    this.webMidi.inputs.forEach(function(input){
        //var li = this.getConfigurableInputRowDOM(input);
        allInputs[ input.id ] = input.name;
    });

    for(var idx in this.opts.noteInputs) {
        if (!this.opts.noteInputs.hasOwnProperty(idx) || idx === "all") { continue; }
        if(typeof allInputs[this.opts.noteInputs[idx].id] !== "undefined") {
            continue;
        }
        allInputs[ this.opts.noteInputs[idx].id ] = this.opts.noteInputs[idx].name + " (not found)";
    }

    for(var idx in this.opts.clockInputs) {
        if (!this.opts.clockInputs.hasOwnProperty(idx) || idx === "all") { continue; }
        if(typeof allInputs[this.opts.clockInputs[idx].id] !== "undefined") {
            continue;
        }
        allInputs[ this.opts.clockInputs[idx].id ] = this.opts.clockInputs[idx].name + " (not found)";
    }
    return allInputs;
};

