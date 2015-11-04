//==============================================================================
//
// Custom Audio stuff
//
//==============================================================================

var MyMusic = MyMusic || {
    // note duration definitions in multiples of beats
    WHOLE_N     : 1,
    HALF_N      : 0.5,
    QUARTER_N   : 0.25,
    EIGHTH_N    : 0.125,
    SIXTEENTH_N : 0.0625,
};

MyMusic.common = {
    // Utitilty function that converts a string into a sequence of note data
    // that can be passed to the NotePlayer Class
    notes_string_to_notes: function (s, key, scale) {
        var KEY_midi = typeof(key) == "string" ? MIDIUtils.noteNameToNoteNumber(key) : key;

        var ret_notes = {},
            notes = s.split(" ");

        var loc = 0;

        for (var i in notes) {
            var note = notes[i].trim();

            if (note != "") {
                var note_details = note.split(",");
                var pitch       = note_details[0],
                    dur_string  = note_details[1],
                    freq;

                // allow rests (defined by 'x' in note string)
                if (pitch == 'x') {

                    freq = -1; // freq of -1 means this note will be silent

                } else {

                    var pitch = +pitch;

                    if (typeof(scale) !== 'undefined') {

                        // calculate pitch from given note in scale
                        if (pitch >= 0) {
                            var index = pitch % scale.length;
                        } else {
                            var index = (scale.length - 1) + ((pitch + 1) % scale.length);
                        }

                        var scale_pitch = scale[index]; // get pitch from scale
                        scale_pitch += (Math.floor(pitch / scale.length)) * 12; // add octave
                        pitch = scale_pitch

                        // variable "pitch" is now a MIDI note number
                    }

                    freq = MIDIUtils.noteNumberToFrequency( KEY_midi + (pitch) ); // pitch of 0 is KEY pitch
                }

                duration = NotePlayer.prototype.duration_string_to_duration(dur_string);
                ret_notes[loc] = freq;
                
                loc += duration;
            }
        }
        ret_notes[loc] = -1;
        return ret_notes;
    },
    shift_octave: function (n, i) { return n + (12 * (i || 0)); }
};

MyMusic.scales = {
    MAJOR:      [0, 2, 4, 5, 7, 9, 11],
    DORIAN:     [0, 2, 3, 5, 7, 9, 10],
    PHRYGIAN:   [0, 1, 3, 5, 7, 8, 10],
    LYDIAN:     [0, 2, 4, 6, 7, 9, 11],
    MIXOLYDIAN: [0, 2, 4, 5, 7, 9, 10],
    AEOLIAN:    [0, 2, 3, 5, 7, 8, 10], MINOR: [0, 2, 3, 5, 7, 8, 10],
    LOCRIAN:    [0, 1, 3, 5, 6, 8, 10],

    MINOR_PENT: [0, 3, 5, 7, 10],
};

//------------------------------------------------------------------------------
// Synth Class
//

function Synth(context, gain) {
    this.oscillator;
    this.amp;
    this.GAIN = gain || 0.1;
    this.context = context;

    if( this.context )
    {
        this.oscillator = this.context.createOscillator();
        fixOscillator(this.oscillator);

        this.oscillator.frequency.value = 440;

        this.amp = this.context.createGain();
        this.amp.gain.value = 0;
    
        // Connect oscillator to amp and amp to the mixer of the context.
        // This is like connecting cables between jacks on a modular synth.
        this.oscillator.connect(this.amp);
        this.amp.connect(this.context.destination);

        this.oscillator.start(0);

        writeMessageToID( "soundStatus", "<p>Audio initialized.</p>");
    }
}

Synth.prototype.startTone = function(frequency, gain) {
    var now = this.context.currentTime;
    this.oscillator.frequency.setValueAtTime(frequency, now);
    
    // Ramp up the gain so we can hear the sound.
    // We can ramp smoothly to the desired value.
    // First we should cancel any previous scheduled events that might interfere.
    this.amp.gain.cancelScheduledValues(now);
    // Anchor beginning of ramp at current value.
    this.amp.gain.setValueAtTime(this.amp.gain.value, now);
    this.amp.gain.linearRampToValueAtTime(gain, this.context.currentTime + 0.01);
    
    writeMessageToID( "soundStatus", "<p>Play tone at frequency = " + frequency  + "</p>");
};

Synth.prototype.stopTone = function() {

    var now = this.context.currentTime;

    this.amp.gain.cancelScheduledValues(now);

    this.amp.gain.setValueAtTime(this.amp.gain.value, now);
    this.amp.gain.linearRampToValueAtTime(0.0, this.context.currentTime + 0.01);

    writeMessageToID( "soundStatus", "<p>Stop tone.</p>");

};

//
// End Synth Class
//------------------------------------------------------------------------------


//------------------------------------------------------------------------------
// Note Player Class
//

function NotePlayer(synth, notes) {

    this.synth = synth;
    this.SECONDS_PER_BEAT = 60 / TEMPO;
    this.notes = notes || [];
    this.max_loc = 0;
    for (var loc in this.notes) {
        loc = +loc;
        if (loc > this.max_loc) {
            this.max_loc = loc;
        }
    }

    this.PLAYING = false;

}

// makes the actual sound of the note
NotePlayer.prototype.sound_note = function (note, gain) {

    this.synth.startTone(note.freq, gain);

};

// called at the end of the sequence or just to stop the sound
NotePlayer.prototype.stop = function () {

    this.synth.stopTone();
    this.PLAYING = false;

}

NotePlayer.prototype.duration_string_to_duration = function (s) {

    var dotted = ( s.slice(-1) == '.' );
    var duration = 16 / parseInt(s);
    if (dotted && duration > 1) {
        duration += duration * 0.5;
    }

    return duration;

}

// End Note Player Class
// -----------------------------------------------------------------------------

//------------------------------------------------------------------------------
// Note Controller Class

function NoteController(tempo) {
    this.tempo = tempo || 120;
    this.SECONDS_PER_BEAT = 60 / TEMPO;
    this.players = [];
    this.loc = 0;
}

NoteController.prototype.add_player = function(player) {
    this.players.push(player);
};

NoteController.prototype.play = function() {
    this.stop();
    this.loc = 0;
    this.PLAYING = true;

    for (var i in this.players) {
        this.players[i].PLAYING = true;
        console.log(this.players[i].max_loc);
    }

    // hit it
    this.begin();
}

NoteController.prototype.stop = function () {

    for (var i in this.players) {
        this.players[i].stop();
    }

    this.PLAYING = false;

}

// start the sequence playing
NoteController.prototype.begin = function () {
    this.PLAYING = true;
    this.loc = 0;
    this.play_step();
}

NoteController.prototype.play_step = function () {
    console.log('play step', this.loc);
    var all_players_stopped = true;

    for (var i in this.players) {
        var player = this.players[i];

        if (player.PLAYING) {

            all_players_stopped = false;

            if (this.loc >= player.max_loc) {

                player.stop();

            } else {

                var freq = player.notes[this.loc];
                if (typeof(freq) !== 'undefined') {
                    var gain = ( freq == -1 ) ? 0 : player.synth.GAIN;
                    player.sound_note( {"freq":freq}, gain );
                }

            }

        }
    }
    this.loc++;

    if (all_players_stopped) {
        this.PLAYING = false;
        console.log('players stopped');
    }

    var self = this;
    if (this.PLAYING) {
        requestTimeout(function() {
            self.play_step();
        }, this.SECONDS_PER_BEAT * (1/16) * 1000);

    } else {
        self.stop();;
    }

}

// End Note Controller Class
//------------------------------------------------------------------------------

//==============================================================================
//
// End Custom Audio Stuff
//
//==============================================================================