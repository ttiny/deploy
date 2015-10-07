"use strict";

var Argv = require( './Argv.js' );

class App {
	constructor () {

		this._argv = Argv.parse();
		
		var close = this.close.bind( this );

		process.on( 'SIGINT', close );
		process.on( 'SIGHUP', close );
		process.on( 'SIGTERM', close );
	}

	getArgv () {
		return this._argv;
	}

	onClose ( callback ) {
		if ( callback instanceof Function ) {
			process.nextTick( callback );
		}
	}

	close ( callback ) {

		this.onClose( function () {
			process.exit( code );
		} );

	}

}

module.exports = App;
