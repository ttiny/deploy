"use strict";

require( 'Prototype' );
var Argv = require( './Argv.js' );

class App {
	constructor () {

		this._argv = Argv.parse();
		
		var _this = this;
		var close = function () {
			return _this.close.apply( _this, arguments );
		};

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
