"use strict";

var Yaml = require( 'js-yaml' );
var DeferredYaml = require( './Deferred' );
var ChildProcess = require( 'child_process' );
var Dry = require( '../Dry' );

class Cmd extends DeferredYaml {

	constructor ( data ) {
		super();
		this._cmd = data;
	}
	
	resolve ( vars ) {
		var cmd = vars.render( this._cmd );
		if ( vars.getApp().getArgv().dry ) {
			console.cli( '[DRY]', cmd );
			return Dry;
		}
		console.cli( cmd );
		return ChildProcess.execSync( cmd, { stdio: 'pipe' } ).toString( 'utf8' );
	}
}

module.exports = new Yaml.Type( '!cmd', {
	
	kind: 'scalar',
	
	construct: function ( data ) {
		return new Cmd( data );
	},
	
	instanceOf: Cmd

} );