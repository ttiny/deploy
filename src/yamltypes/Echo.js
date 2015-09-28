"use strict";

var Yaml = require( 'js-yaml' );
var DeferredYaml = require( './Deferred' );
var ChildProcess = require( 'child_process' );

class Echo extends DeferredYaml {

	constructor ( data ) {
		super();
		this._echo = data;
	}
	
	resolve ( vars ) {
		var ret = vars.render( this._echo );
		console.log( ret );
		return ret;
	}
}

module.exports = new Yaml.Type( '!echo', {
	
	kind: 'scalar',
	
	construct: function ( data ) {
		return new Echo( data );
	},
	
	instanceOf: Echo

} );