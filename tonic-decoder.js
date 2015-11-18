var string = "( ( S(x, A-4 Minor) * 4 ) / ( (4,4,2,2)*4 ) ) for x in ((0,2,4,0),(2,3,1,-3),(1,2,3,-1),(2,1,0,-4))";

var target = "0,4 3,4 7,2 0,2 0,4 3,4 7,2 0,2 0,4 3,4 7,2 0,2 0,4 3,4 7,2 0,2 3,4 5,4 2,2 -5,2 3,4 5,4 2,2 -5,2 3,4 5,4 2,2 -5,2 3,4 5,4 2,2 -5,2 2,4 3,4 5,2 -2,2 2,4 3,4 5,2 -2,2 2,4 3,4 5,2 -2,2 2,4 3,4 5,2 -2,2 3,4 2,4 0,2 -7,2 3,4 2,4 0,2 -7,2 3,4 2,4 0,2 -7,2 3,4 2,4 0,2 -7,2";

function decode(string) {
     
}

var decoded_string = decode(string);
console.log(decoded_string == target);
console.log(decoded_string);

//------------------------------------------------------------------------------

var _ND = function(n) {
    this.value = n;
    return this;
}

var ND = function(n) {
    return new _ND(n);
}

function _NG() {
    this.notes = [];

    for (var i = 0; i < arguments.length; i++) {
        var arg = arguments[i];

        if (arg instanceof _NG) {
            for (var j in arg.notes) {
                this.notes.push(arg.notes[j]);
            }
        } else if (arg instanceof _ND) {
            var v = [null, ND(arg.value)];
            this.notes.push(v);
        } else {
            var v = [arg, ND(null)];
            this.notes.push(v);
        }
    }

    return this;
}

_NG.prototype.print = function() {
    var s = '';

    for (var i in this.notes) {
        var n = this.notes[i];
        s += (n[0] === null) ? 'N' : n[0];
        s += ',';
        s += (n[1].value === null) ? 'N' : n[1].value;
        s += ' ';
    }

    s = s.trim();
    return s;
}

_NG.prototype.toString = _NG.prototype.print;

_NG.prototype.add_note = function(n) {
    this.notes.push(n);
}

_NG.prototype._DIVIDE = function(x) {
    var ret_NG = new _NG();

    if (!(x instanceof _NG) && !(x instanceof _ND)) {
        return this;
    } else {
        if (x instanceof _NG) {
            for (var i in this.notes) {
                var n = this.notes[i];
                var x_n = x.notes[clamp(i, 0, x.length-1)];

                ret_NG.add_note([n[0], x_n[1]]);
            }
        } else if (x instanceof _ND) {
            for (var i in this.notes) {
                var n = this.notes[i];
                ret_NG.add_note([n[0], x]);
            }
        }
    }

    return ret_NG;
}

_NG.prototype._ADD = function(x) {
    var ret_NG = new _NG();
    for (var i in this.notes) {
        ret_NG.add_note(this.notes[i]);
    }

    if (x instanceof _NG) {
        for (var i in x.notes) {
            ret_NG.add_note(x.notes[i]);
        }
    }

    return ret_NG;
}

_NG.prototype._MULTIPLY = function(x) {
    var ret_NG = new _NG();
    for (var i = 0; i < x; i++) {
        for (var j in this.notes) {
            ret_NG.add_note(this.notes[j]);
        }
    }
    return ret_NG;
}

_ND.prototype._MULTIPLY = function(x) {
    var ret_NG = new _NG();

    for (var i = 0; i < x; i++) {
        ret_NG.add_note([null, ND(this.value)]);
    }

    return ret_NG;
}

function NG() {
    var args = [this];
    args.push.apply(args, arguments);
    return new (Function.prototype.bind.apply(_NG, args));
}

function DIVIDE(a, b) {
    return a._DIVIDE(b);
}

function MULTIPLY(a, b) {
    try {
        return a._MULTIPLY(b);
    }
    catch (e) {
        if (e instanceof TypeError) {
            throw new Error(a.constructor.name + " has no _MULTIPLY() method");
        }
        else {
            throw e;
        }
    }
}

function ADD(a, b) {
    return a._ADD(b);
}

function Scale(g, scale) {
    var ret_NG = new _NG();

    for (var i in g.notes) {
        var pitch = g.notes[i][0];
        if (pitch === null) { continue; }

        // calculate pitch from given note in scale
        if (pitch >= 0) {
            var index = pitch % scale.length;
        } else {
            var index = (scale.length - 1) + ((pitch + 1) % scale.length);
        }

        var scale_pitch = scale[index]; // get pitch from scale
        scale_pitch += (Math.floor(pitch / scale.length)) * 12; // add octave

        ret_NG.add_note([scale_pitch, ND(g.notes[i][1].value)]);
    }
    return ret_NG;
}

//------------------------------------------------------------------------------

function myTonicFunc(s) {
    var RET;

    s = s.replace(/\(\+/g, 'ADD(');
    s = s.replace(/\(\*/g, 'MULTIPLY(');

    eval(s);

    return RET;
}

var a = ND(1);
var b = MULTIPLY( ND(2), 4 );
var c = MULTIPLY( ND(3), 4 );
var d = NG(0, 2, 4, 0);

//var z = myTonicFunc();
//console.log('z', z.print());