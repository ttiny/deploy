"use strict";

var Yaml = require( 'js-yaml' );
var DeferredYaml = require( './Deferred' );
var Fs = require( 'fs' );

class TextFile extends DeferredYaml {	

	constructor ( data ) {
		super();
		this._file = data;
	}

	resolve ( vars ) {
		var file = vars.render( this._file );
		if ( Fs.existsSync( file ) ) {
			return Fs.readFileSync( file, 'utf8' );
		}
		return null;
	}
}

module.exports = new Yaml.Type( '!textfile', {
	
	kind: 'scalar',
	
	construct: function ( data ) {
		return new TextFile( data );
	},
	
	instanceOf: TextFile

} );