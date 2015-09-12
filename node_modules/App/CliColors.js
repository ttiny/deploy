"use strict";

//usage: console.log( clr.blue, clr.greenbg, 'blue on green background', clr.def, 'default on green background', clr.rest, 'default' );

var clr = {
	reset: '\x1B[0m',
	
	def: '\x1B[39m',
	defbg: '\x1B[49m',
	
	black: '\x1B[30m',
	blackbg: '\x1B[40m',
	
	gray: '\x1B[90m',
	graybg: '\x1B[100m',
	intenseblack: '\x1B[90m',
	brightblack: '\x1B[90m',
	intenseblackbg: '\x1B[100m',
	brightblackbg: '\x1B[100m',
	
	red: '\x1B[31m',
	redbg: '\x1B[41m',
	
	intensered: '\x1B[91m',
	brightred: '\x1B[91m',
	intenseredbg: '\x1B[101m',
	brightredbg: '\x1B[101m',
	
	green: '\x1B[32m',
	greenbg: '\x1B[42m',
	
	intensegreen: '\x1B[92m',
	brightgreen: '\x1B[92m',
	intensegreenbg: '\x1B[102m',
	brightgreenbg: '\x1B[102m',
	
	yellow: '\x1B[33m',
	yellowbg: '\x1B[43m',
	
	intenseyellow: '\x1B[93m',
	brightyellow: '\x1B[93m',
	intenseyellowbg: '\x1B[103m',
	brightyellowbg: '\x1B[103m',
	
	blue: '\x1B[34m',
	bluebg: '\x1B[44m',
	
	intenseblue: '\x1B[94m',
	brightblue: '\x1B[94m',
	intensebluebg: '\x1B[104m',
	brightbluebg: '\x1B[104m',
	
	magenta: '\x1B[35m',
	magentabg: '\x1B[45m',
	
	intensemagenta: '\x1B[95m',
	brightmagenta: '\x1B[95m',
	intensemagentabg: '\x1B[105m',
	brightmagentabg: '\x1B[105m',
	
	cyan: '\x1B[36m',
	cyanbg: '\x1B[46m',
	
	intensecyan: '\x1B[96m',
	brightcyan: '\x1B[96m',
	intensecyanbg: '\x1B[106m',
	brightcyanbg: '\x1B[106m',
	
	white: '\x1B[37m',
	whitebg: '\x1B[47m',

	intensewhite: '\x1B[97m',
	brightwhite: '\x1B[97m',
	intensewhitebg: '\x1B[107m',
	brightwhitebg: '\x1B[107m',
};

module.exports = clr;