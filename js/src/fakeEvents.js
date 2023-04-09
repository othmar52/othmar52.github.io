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
                    number: 80
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
                    number: 80
                }
            });
        });
    }
    return this;
};
