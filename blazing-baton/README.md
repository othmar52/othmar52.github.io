# blazing-baton
Infoscreen for live music performing with MIDI equipment


In case you're playing synthesizers with a couple of people to a 4/4 beat, all synchronized to one MIDI clock, **Blazing Baton** might be useful.

## Main Features
  * Indication of incoming MIDI clock as a 16 bar loop
  * Realtime displaying of channel separated "Hot keys" based on configurable calculation

[DEMO](https://othmar52.github.io/) with fake midi events

## Requirements
  * Modern webbrowser that supports [Web MIDI API](https://webaudio.github.io/web-midi-api/)
  * MIDI interface connected to the pc
    - receive MIDI clock signal
    - receive MIDI noteon/noteoff events on different channels and/or MIDI inputs
    

## Configuration

Currently you have to configure **Blazing Baton** directly at the very bottom of `index.htm`. There are plans to create a configuration GUI but for now you have to deal with a javascript configuration object.

Further It is highly possible that those names get changed until the first release.


### `inputNames`
Listening to incoming MIDI events does only occur for inputs that are activated by configuration.
Doublecheck for misspelling! Otherwise incoming events will be ignored!
#### `inputNames.clock` {Array}
Define on which MIDI input **Blazing Baton** should listen for MIDI clock events.


**NOTE:** In case you define multiple inputs that are sending the clock simultaneously the tempo will be doubled.

for Example
```javascript
            var blazingOptions = {
                inputNames: {
                    clock: [
                        "MIDIIN16 (iConnectMIDI4+)"
                    ]
                }
            };
```

#### `inputNames.notes` {Array}
Define on which MIDI input **Blazing Baton** should listen for MIDI noteon/noteoff events.
for Example
```javascript
            var blazingOptions = {
                inputNames: {
                    notes: [
                        "MIDIIN16 (iConnectMIDI4+)",
                        "MIDIIN15 (iConnectMIDI4+)"
                    ]
                }
            };
```



### `inputCustomization` {Array}
Here you can assign colors and labels to your MIDI channels. You can use the colors `grey`, `pink`, `cyan`, `violet`, `red`, `orange`, `green`, `blue`, `yellow`.

for Example
```javascript
            var blazingOptions = {
                inputCustomization: {
                    "all":         { color: "grey",   label: "Sum"          },
                    "input-15-1":  { color: "orange", label: "JD-Xi D1"     },
                    "input-15-2":  { color: "orange", label: "JD-Xi D2"     },
                    "input-15-3":  { color: "yellow", label: "JD-Xi A"      },
                    "input-15-5":  { color: "green",  label: "System 1"     },
                    "input-15-7":  { color: "red",    label: "Virus"        },
                    "input-15-8":  { color: "cyan",   label: "Microkorg"    },
                    "input-15-14": { color: "blue",   label: "MFB Synth II" },
                    "input-15-9":  { color: "blue",   label: "KORG Gadget"  },
                    "input-16-1":  { color: "pink",   label: "Bass Station" },
                    "input-16-2":  { color: "violet", label: "Mininova"     }
                }
            };
```



### `hotSpot`
As electronic music is heavily based on loops you can define length and resolution of **Hot keys**. This may allows all musicians to see which notes the other musicians are playing.

#### `hotSpot.resolution` {Number} 
Define the size in `[clock ticks]` of a single hotSpot.
Meaningful values are
```ìni
12 = 1/8 bar
24 = 1/4 bar
48 = 1/2 bar
96 = 1 bar
```
**ATTENTION:** unreasonable values may cause chaos or performance issues

#### `hotSpot.observationPeriod` {Number} 
Define the loop length in `[bars]` of a the full hotSpot loop.

Meaningful values are `1`, `4`, `8`, `16`

**ATTENTION:** unreasonable values may cause chaos or performance issues

#### `hotSpot.showMerged` {Boolean} 
If set to `true` an additional hot spot row with the sum of all channels will be displayed at the very top. In theory all musicians should see which base key the current music performance has.

#### `hotSpot.maxChannelRows` {Number} 
Limit the amount of separate channels. the most active channels are on top. inactive channels disappears automatically after some time. A possible sum channel (@see `hotSpot.showMerged`) is excluded from this configuration value.


#### `hotSpot.lifeTime` {Number} 
Here you can configure how long `[seconds]` played notes should be included into the hotness calculation. Keys that has been played 3 minutes before should't be treated as hot, right? This also affects the check if any input should be treated as inactive which results in hiding the channel hot spot row.


#### `hotSpot.ignoreChannel10` {Boolean} 
As MIDI channel 10 is the default channel for drums it might be useful to ignore incoming note events on MIDI channel 10.
Set this to `false` if you send keys over channel 10.



### `time`
After recieving a clock start event a big timer `MM:SS` shows the time since last clock start. This might be useful if you want to limit live recordings to a certain limit.

#### `time.totalTimeWarning` {Number} 
When the time reaches 70% of totalTimeWarning `[seconds]` it gets more dominance in the GUI. When reaching 100% it turns red. 

#### `time.stopStartTreshold` {Number} 
Sometimes MIDI hardware needs a `stop + start` event to be in sync again. To avoid a total time reset you can configure a treshold `[miliseconds]`. Recieving a `stop` followed by a `start` within this timerange will skip the total time reset.


### `hideCursorAfter` {Number}
As **Blazing Baton** is an info screen without keyboard/mouse interaction you may want to hide the mouse cursor on idle.
To disable the hiding set this to `0`. Otherwise you can set any number in `[seconds]`


### `noSleep` {Boolean}
As **Blazing Baton** is an info screen without keyboard/mouse interaction your pc maybe activates the screen saver. Set this to `true` if you want to deactivate the screensaver during incoming clock events. Otherwise set it to `false`.


### `bar16changeAnnounce` {String}
At the end of bar 16, just before starting with bar 1 again, a huge countdown is displayed in the GUI. This should sensitize all musicians to reflect this change in their playing. Here you can configure the very last part of the huge countdown ` 3... 2... 1... {bar16changeAnnounce}`. Default value: `and`




