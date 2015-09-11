"use strict";

var Yaml = require( 'js-yaml' );
var DeferredYaml = require( './Deferred' );
var ChildProcess = require( 'child_process' );

// if this is class and it extends this is undefined in the constructor with node 4.0.0
function Cmd ( data ) {
	this._cmd = data;
}

Cmd.extend( DeferredYaml, {
	
	resolve ( vars ) {
		return ChildProcess.execSync( vars.render( this._cmd ), { stdio: 'pipe' } ).toString( 'utf8' );
	}
} );

module.exports = new Yaml.Type( '!cmd', {
	
	kind: 'scalar',
	
	construct: function ( data ) {
		return new Cmd( data );
	},
	
	instanceOf: Cmd

} );