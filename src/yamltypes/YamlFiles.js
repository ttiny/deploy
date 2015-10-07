"use strict";

var Yaml = require( 'js-yaml' );
var DeferredYaml = require( './Deferred' );
var Fs = require( 'fs' );
var Glob = require( 'glob' );

class YamlFiles extends DeferredYaml {	
	
	constructor ( data ) {
		super();
		if ( data.startsWith( 'concat ' ) ) {
			this._merge = false;
			data = data.slice( 7 );
		}
		else if ( data.startsWith( 'merge ' ) ) {
			this._merge = true;
			data = data.slice( 6 );
		}
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
		if ( this._merge && allIsObj ) {
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