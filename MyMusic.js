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

        var ret_notes = [],
            notes = s.split(" ");

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

                ret_notes.push({
                    "freq": freq,
                    "dur": duration,
                });
            }
        }

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

function NotePlayer(synth, tempo, notes) {

    this.synth = synth;
    this.TEMPO = tempo || 120;
    this.SECONDS_PER_BEAT = 60 / TEMPO;
    this.current_note_index = 0;
    this.notes = notes || [];
    this.PLAYING = false;

}

// returns next note in sequence (or undefined if all the notes have
// been played)
NotePlayer.prototype.get_next_note = function () {
    this.current_note_index++;
    return this.notes[this.current_note_index];

}

// makes the actual sound of the note
NotePlayer.prototype.sound_note = function (note, gain) {

    this.synth.startTone(note.freq, gain);

};

// start the sequence playing
NotePlayer.prototype.begin = function () {
    var current_note = this.notes[this.current_note_index];
    this.play_step(current_note);

}

// runs each note: sounds the note, then calls itself after a duration
// to play the next one
NotePlayer.prototype.play_step = function (note) {

    var gain = ( note.freq == -1 ) ? 0 : this.synth.GAIN;
    this.sound_note(note, gain);

    var next_note = this.get_next_note();

    var self = this;
    if (typeof(next_note) !== 'undefined') {
        requestTimeout(function() {
            self.play_step(next_note);
        }, this.SECONDS_PER_BEAT * note.dur * 1000);

    } else {

        requestTimeout(function() {
            self.stop();
        }, this.SECONDS_PER_BEAT * note.dur * 1000);

    }

}

// called at the end of the sequence or just to stop the sound
NotePlayer.prototype.stop = function () {

    this.synth.stopTone();
    this.PLAYING = false;

}

// play given notes all the way through
NotePlayer.prototype.play = function () {
    this.stop();

    this.current_note_index = 0;

    this.PLAYING = true;

    // hit it
    this.begin();
}

NotePlayer.prototype.duration_string_to_duration = function (s) {

    var dotted = ( s.slice(-1) == '.' );

    var duration = 0;
    
    switch( parseInt(s) ) {
        case 1: // Whole
            duration = MyMusic.WHOLE_N;
            break;
        case 2: // Half
            duration = MyMusic.HALF_N;
            break;
        case 4: // Quarter
            duration = MyMusic.QUARTER_N;
            break;
        case 8: // Eighth
            duration = MyMusic.EIGHTH_N;
            break;
        case 16: // Sixteenth
            duration = MyMusic.SIXTEENTH_N;
            break;

    }

    if (dotted) {
        duration += duration * 0.5;
    }

    return duration;

}

// End Note Player Class
// -----------------------------------------------------------------------------

//==============================================================================
//
// End Custom Audio Stuff
//
//==============================================================================