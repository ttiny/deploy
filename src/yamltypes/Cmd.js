"use strict";

var Yaml = require( 'js-yaml' );
var DeferredYaml = require( './Deferred' );
var ChildProcess = require( 'child_process' );

class Cmd extends DeferredYaml {

	constructor ( data ) {
		super();
		this._cmd = data;
	}
	
	resolve ( vars ) {
		return ChildProcess.execSync( vars.render( this._cmd ), { stdio: 'pipe' } ).toString( 'utf8' );
	}
}

module.exports = new Yaml.Type( '!cmd', {
	
	kind: 'scalar',
	
	construct: function ( data ) {
		return new Cmd( data );
	},
	
	instanceOf: Cmd

} );