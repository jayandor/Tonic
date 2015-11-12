var string = "( ( S(x, A-4 Minor) * 4 ) / ( (4,4,2,2)*4 ) ) for x in ((0,2,4,0),(2,3,1,-3),(1,2,3,-1),(2,1,0,-4))";

var target = "0,4 3,4 7,2 0,2 0,4 3,4 7,2 0,2 0,4 3,4 7,2 0,2 0,4 3,4 7,2 0,2 3,4 5,4 2,2 -5,2 3,4 5,4 2,2 -5,2 3,4 5,4 2,2 -5,2 3,4 5,4 2,2 -5,2 2,4 3,4 5,2 -2,2 2,4 3,4 5,2 -2,2 2,4 3,4 5,2 -2,2 2,4 3,4 5,2 -2,2 3,4 2,4 0,2 -7,2 3,4 2,4 0,2 -7,2 3,4 2,4 0,2 -7,2 3,4 2,4 0,2 -7,2";

function decode(string) {
     
}

var decoded_string = decode(string);
console.log(decoded_string == target);
console.log(decoded_string);