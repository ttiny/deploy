"use strict";

var Yaml = require( 'js-yaml' );

function Cmd ( data ) {
	this._data = data;
}

Cmd.define( {
	toString: function () {

		console.log( this._data );
		return this._data;

	}
} )

module.exports = new Yaml.Type( '!cmd', {
	
	kind: 'scalar',
	
	construct: function ( data ) {
		return new Cmd( data );
	},
	
	instanceOf: Cmd

} );