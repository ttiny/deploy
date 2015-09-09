"use strict";

var Yaml = require( 'js-yaml' );
var ChildProcess = require( 'child_process' );

class Cmd {
	constructor ( data ) {
		this._cmd = data;
	}
	
	toString ( vars ) {

		return ChildProcess.execSync( vars.render( this._cmd ), { stdio: 'inherit' } ).toString( 'utf8' );
	}
}

module.exports = new Yaml.Type( '!cmd', {
	
	kind: 'scalar',
	
	construct: function ( data ) {
		return new Cmd( data );
	},
	
	instanceOf: Cmd

} );