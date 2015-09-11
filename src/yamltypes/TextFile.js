"use strict";

var Yaml = require( 'js-yaml' );
var DeferredYaml = require( './Deferred' );
var Fs = require( 'fs' );

// if this is class and it extends this is undefined in the constructor with node 4.0.0
function TextFile ( data ) {
	this._file = data;
}

TextFile.extend( DeferredYaml, {	
	resolve ( vars ) {
		var file = vars.render( this._file );
		if ( Fs.existsSync( file ) ) {
			return Fs.readFileSync( file, 'utf8' );
		}
		return null;
	}
} );

module.exports = new Yaml.Type( '!textfile', {
	
	kind: 'scalar',
	
	construct: function ( data ) {
		return new TextFile( data );
	},
	
	instanceOf: TextFile

} );