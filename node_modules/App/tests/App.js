var App = require( '../App.js' );

UnitestA( 'SIG handling', function ( test ) {
	process.on( 'exit', function ( code ) {
		test( code === 0 );
		test.out();
	} );

	var app = new App();
	process.kill( process.pid, 'SIGINT' );
} );
