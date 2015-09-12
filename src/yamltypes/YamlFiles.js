"use strict";

var Yaml = require( 'js-yaml' );
var DeferredYaml = require( './Deferred' );
var Fs = require( 'fs' );
var Glob = require( 'glob' );

class YamlFiles extends DeferredYaml {	
	
	constructor ( data ) {
		super();
		this._pattern = data;
	}

	resolve ( vars ) {
		var pattern = vars.render( this._pattern );
		var files = Glob.sync( pattern );
		var allIsObj = true;
		for ( var i = 0, iend = files.length; i < iend; ++i ) {
			files[ i ] = LoadYaml( files[ i ] );
			if ( !Object.isObject( files[ i ] ) ) {
				allIsObj = false;
			}
		}
		if ( allIsObj ) {
			var yaml = {};
			for ( var i = 0, iend = files.length; i < iend; ++i ) {
				yaml.mergeDeep( files[ i ] );
			}
			return yaml;
		}
		return files;
	}
}

module.exports = new Yaml.Type( '!yamlfiles', {
	
	kind: 'scalar',
	
	construct: function ( data ) {
		return new YamlFiles( data );
	},
	
	instanceOf: YamlFiles

} );