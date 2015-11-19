//==============================================================================
//
// Custom Audio stuff
//
//==============================================================================
//
//------------------------------------------------------------------------------
// NOTES SYNTAX REFERNCE
//
// Example:
//   0,4                ; #1
//   1,4                ; #2
//   2,4
//   x,8                ; #3
//
//   0,4
//   1,4
//   2#,8               ; #4
//   2x,4               ; #5
//   x,4
//   ; End                #6
//
//  Notes are separated by whitespace (spaces, newlines).
//  From above:
//      1. First number (0) is note value (0 = first note in scale).
//      2. Second number is duration (1/4 or a quarter note).
//      3. A value of 'x' denotes a rest.
//      4. '#'s or 'b's can be added to notes to sharpen or flatten them, respectively.
//      5. A note value followed by 'x' denotes a "staccato" note, which is
//         played quickly (1/16) then folowed by silence. The total length of
//         the note plus silence is still determined by the given duration
//      6. ';' marks the rest of the line as a comment and is ignored by the parser.
//------------------------------------------------------------------------------

function clamp(num, min, max) {
  return num < min ? min : num > max ? max : num;
}

var Tonic = Tonic || {
    // note duration definitions in multiples of beats
    WHOLE_N     : 1,
    HALF_N      : 0.5,
    QUARTER_N   : 0.25,
    EIGHTH_N    : 0.125,
    SIXTEENTH_N : 0.0625,
};

function NotesData(notes) {
    this.notes = notes;
}

Tonic.common = {
    // Parse a string into an array of tokens
    tokenize: function (s) {
        var tokens = [];
        var prev_token;

        var operators = {
            'return':['return','RETURN'],
            '==':['==','DOUBLEEQUALS'],
            ',': [',','COMMA'],
            '*': ['*','TIMES'],
            '/': ['/','DIVIDE'],
            '=': ['=','EQUALS'],
            '(': ['(','OPENPAREN'],
            ')': [')','CLOSEPAREN'],
            '<': ['<','OPENBRACKET'],
            '>': ['>','CLOSEBRACKET'],
            '\n':[';','EOL'],
            ';': [';','EOL']
        };

        var whitespace_split = s.match(/\S+|\n/g);
        
        // loop through strings split on whitespace
        for (var i in whitespace_split) {
            var word = whitespace_split[i];
            var token = '';

            // check if word is operator
            if ( typeof(operators[word]) !== 'undefined' ) {
                tokens.push(operators[word]);
                continue;
            }
            
            // go character by character through string, separating
            // out any tokens from the string
            for (var j in word) {

                var c = word[j];
                var prev_c = (j > 0) ? word[j-1] : undefined;
                var is_operator = false,
                    two_char_op = false; // is a two-character operator like "=="
                
                // check for two-character operators by looking at
                // this char and previous char together
                if ( typeof(operators[ prev_c + c ]) !== 'undefined') {
                    is_operator = true;
                    two_char_op = true;
                }
                // check for single-character operators
                if ( typeof(operators[c]) !== 'undefined' ) {
                    is_operator = true;
                }
                // if not an operator add to token string. otherwise push the
                // operator as well as the token string
                if (!is_operator) {
                    token += c;
                } else {
                    if (two_char_op) {
                        token = token.slice(0,-1);
                        if (token) {
                           tokens.push(token);
                        }
                        tokens.push(operators[ prev_c + c ]);
                        token = '';
                    } else {
                        if (token) {
                            tokens.push(token);
                        }
                        tokens.push(operators[c]);
                        token = '';
                    }
                }
            }

            if (token) {
                tokens.push(token);
            }
        }
        
        return tokens;
    },
    // Parses an array of tokens into a string that can be passed to notes_string_to_notes
    parse: function (tokens) {
        
        var ret_str = '';
        var tree = new Tree('root');
        
        for (var i in tokens) {
            var token = tokens[i];
            
            if (token.constructor === Array) {
            } else {
                if (token.match(/\d+/)) {
                    var note_value = +token;
                    var n = NotesData([note_value, null]);
                }
            }
        }

        return ret_str;
    },
    // Utitilty function that converts a string into a sequence of note data
    // that can be passed to the NotePlayer Class
    notes_string_to_notes: function (s, key, scale) {
        var KEY_midi = typeof(key) == "string" ? MIDIUtils.noteNameToNoteNumber(key) : key;

        // remove comments
        s = s.replace(/;.*/g, '');

        var ret_notes = {},
            notes = s.split(/\s+/);

        var loc = 0;

        for (var i in notes) {
            var note = notes[i].trim();

            if (note != "") {

                var note_details = note.split(",");
                var pitch       = note_details[0].trim(),
                    dur_string  = note_details[1].trim(),
                    freq,
                    staccato = false;

                // allow rests (defined by 'x' in note string)
                if (pitch == 'x') {

                    freq = -1; // freq of -1 means this note will be silent

                } else {
                    // check if note is staccato
                    staccato = dur_string.slice(-1) == 'x';
                    dur_string = dur_string.replace('x','');

                    // count up pitch modifiers
                    var offset = ((pitch.match(/#/g) || []).length) - ((pitch.match(/b/g) || []).length);
                    pitch = pitch.replace(/#/g, '');
                    pitch = pitch.replace(/b/g, '');

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
                    pitch += offset;

                    freq = MIDIUtils.noteNumberToFrequency( KEY_midi + (pitch) ); // pitch of 0 is KEY pitch
                }

                // default to silence if the pitch was miscalculated
                if (isNaN(freq)) {
                    freq = -1;
                }

                duration = NotePlayer.prototype.duration_string_to_duration(dur_string);

                // if this note is staccato, add 2 notes: this one at 1/16 and
                // a rest at (duration - 1/16)
                if (staccato) {

                    var rest_duration = duration - 1;
                    duration = 1;

                    // add this note
                    ret_notes[loc] = freq;
                    loc += duration;
                    // add rest
                    ret_notes[loc] = -1;
                    loc += rest_duration;

                } else {

                    ret_notes[loc] = freq;
                    loc += duration;

                }

            }
        }
        ret_notes[loc] = -1;
        return ret_notes;
    },
    shift_octave: function (n, i) { return n + (12 * (i || 0)); },
};

Tonic.scales = {
    MAJOR:      [0, 2, 4, 5, 7, 9, 11],
    DORIAN:     [0, 2, 3, 5, 7, 9, 10],
    PHRYGIAN:   [0, 1, 3, 5, 7, 8, 10],
    LYDIAN:     [0, 2, 4, 6, 7, 9, 11],
    MIXOLYDIAN: [0, 2, 4, 5, 7, 9, 10],
    AEOLIAN:    [0, 2, 3, 5, 7, 8, 10], MINOR: [0, 2, 3, 5, 7, 8, 10],
    LOCRIAN:    [0, 1, 3, 5, 6, 8, 10],

    MINOR_PENT: [0, 3, 5, 7, 10],
};

Tonic.active_voices = {};

//------------------------------------------------------------------------------
// Synth Class
//

var Voice = (function(context) {
    function Voice(frequency, gain, type){
        this.frequency = frequency;
        this.gain = gain;
        this.oscillators = [];
        this.type = type;
    };

    Voice.prototype.start = function() {
        /* VCO */
        var vco = context.createOscillator();
        console.log(vco);
        vco.type = this.type;
        vco.frequency.value = this.frequency;

        /* VCA */
        var vca = context.createGain();
        vca.gain.value = this.gain;

        /* connections */
        vco.connect(vca);
        vca.connect(context.destination);

        vco.start(0);

        /* Keep track of the oscillators used */
        this.oscillators.push(vco);
    };

    Voice.prototype.stop = function() {
        for (var i in this.oscillators) {
            var oscillator = this.oscillators[i];
            oscillator.stop();
        }
    };

    return Voice;
  })(audioContext);

function Synth(context, gain, osc_type) {
    // this.oscillator;
    // this.amp;
    this.GAIN = gain || 0.1;
    this.context = context;
    this.osc_type = osc_type;

    // if( this.context )
    // {
    //     this.oscillator = this.context.createOscillator();
    //     fixOscillator(this.oscillator);

    //     this.oscillator.type = osc_type || 'sine';
    //     this.oscillator.frequency.value = 440;

    //     this.amp = this.context.createGain();
    //     this.amp.gain.value = 0;
    
    //     // Connect oscillator to amp and amp to the mixer of the context.
    //     // This is like connecting cables between jacks on a modular synth.
    //     this.oscillator.connect(this.amp);
    //     this.amp.connect(this.context.destination);

    //     this.oscillator.start(0);

    //     writeMessageToID( "soundStatus", "<p>Audio initialized.</p>");
    // }
}

Synth.prototype.startTone = function(frequency, gain) {
    // var now = this.context.currentTime;
    // this.oscillator.frequency.setValueAtTime(frequency, now);
    
    // // Ramp up the gain so we can hear the sound.
    // // We can ramp smoothly to the desired value.
    // // First we should cancel any previous scheduled events that might interfere.
    // this.amp.gain.cancelScheduledValues(now);
    // // Anchor beginning of ramp at current value.
    // this.amp.gain.setValueAtTime(this.amp.gain.value, now);
    // this.amp.gain.linearRampToValueAtTime(0, this.context.currentTime + 0.05);
    // this.amp.gain.setValueAtTime(this.amp.gain.value, now);
    // this.amp.gain.linearRampToValueAtTime(gain, this.context.currentTime + 0.05);

    var voice = new Voice(frequency, gain, this.osc_type);
    Tonic.active_voices[frequency] = voice;
    voice.start()
    console.log('av', Tonic.active_voices);

    
    writeMessageToID( "soundStatus", "<p>Play tone at frequency = " + frequency  + "</p>");
};

Synth.prototype.stopTone = function(frequency) {

    // var now = this.context.currentTime;

    // this.amp.gain.cancelScheduledValues(now);

    // this.amp.gain.setValueAtTime(this.amp.gain.value, now);
    // this.amp.gain.linearRampToValueAtTime(0.0, this.context.currentTime + 0.5);

    // writeMessageToID( "soundStatus", "<p>Stop tone.</p>");

    if (frequency) {
        if (Tonic.active_voices[frequency]) {
            Tonic.active_voices[frequency].stop();
            delete Tonic.active_voices[frequency];
        }
    }
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
    this.active_voices = [];

    this.PLAYING = false;

}

// makes the actual sound of the note
NotePlayer.prototype.sound_note = function (note, gain) {

    for (var i in this.active_voices) {
        this.synth.stopTone(this.active_voices[i]);
    }
    this.active_voices = [];
    this.active_voices.push(note.freq);
    this.synth.startTone(note.freq, gain);

};

// called at the end of the sequence or just to stop the sound
NotePlayer.prototype.stop = function () {

    for (var i in this.active_voices) {
        this.synth.stopTone(this.active_voices[i]);
    }
    this.active_voices = [];
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

NoteController.prototype.play = function(offset) {
    this.stop();
    this.loc = offset || 0;
    this.PLAYING = true;

    for (var i in this.players) {
        this.players[i].PLAYING = true;
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
        }, this.SECONDS_PER_BEAT * (1/4) * 1000);

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
