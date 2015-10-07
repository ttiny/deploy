var clr = require( 'App/CliColors' );
var ChildProcess = require( 'child_process' );

console.cli = function () {
	process.stdout.write( clr.cyan );
	console.log.apply( console, [ '>' ].concat( Array.prototype.slice.call( arguments ) ) );
	process.stdout.write( clr.reset );
};

console.cliOutput = function () {
	process.stdout.write( clr.white );
	console.log.apply( console, arguments );
	process.stdout.write( clr.reset );
};

console.infoGroup = function () {
	process.stdout.write( clr.intenseblue );
	console.log.apply( console, arguments );
	process.stdout.write( clr.reset );
};

console.info = function () {
	process.stdout.write( clr.green );
	console.log.apply( console, arguments );
	process.stdout.write( clr.reset );
};

console.warn = function () {
	process.stdout.write( clr.yellow );
	console.log.apply( console, arguments );
	process.stdout.write( clr.reset );
};

var console_error = console.error;

console.error = function () {
	process.stdout.write( clr.intensered );
	console_error.apply( console, arguments );
	process.stdout.write( clr.reset );
};

console.spawn = function ( cmd, args, options ) {
	console.cli( cmd, args.join( ' ' ) );
	var output = [];
	var ret = ChildProcess.spawnSync( cmd, args, options );
	var printed = false;
	if ( ret.stdout ) {
		var str = ret.stdout.toString();
		if ( str.length > 0 ) {
			process.stdout.write( clr.white );
			process.stdout.write( str );
			if ( !str.endsWith( '\n\n' ) ) {
				process.stdout.write( '\n' );
			}
			process.stdout.write( clr.reset );
			printed = true;
		}
	}
	if ( ret.stderr ) {
		var str = ret.stderr.toString();
		if ( str.length > 0 ) {
			process.stderr.write( clr.red );
			process.stderr.write( str );
			if ( !str.endsWith( '\n\n' ) ) {
				process.stderr.write( '\n' );
			}
			process.stderr.write( clr.reset );
			printed = true;
		}
	}
	if ( !printed ) {
		process.stdout.write( '\n' );
	}
	return ret;
};