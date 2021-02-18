
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
        console.log("clicki");
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
BlazingBaton.prototype.completeSettingsWithInputs = function() {
    console.log("completeSettingsWithInputs");
    //console.log(this.webMidi.inputs);
    //console.log(WebMidi.inputs);
    var that = this;
    var ul = document.querySelector(this.domSelectors.inputConfig);
    this.webMidi.inputs.forEach(function(input){
        //var li = this.getConfigurableInputRowDOM(input);
        ul.appendChild(that.getConfigurableInputRowDOM(input));
    });
    return this;
};



/**
 * create DOM elements for piano
 *
 * @method getChannelHotspotDom
 * @static
 *
 * @param input {Object} The MIDI input provided by webMidi
 *
 * @return {domElement} checkboxes markup
 */
BlazingBaton.prototype.getConfigurableInputRowDOM = function(input) {


    console.log(input);
    var li = document.createElement("li");
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
};

