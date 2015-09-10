"use strict";

var YamlType = require( './YamlType' );

class DeferredYaml extends YamlType {

	resolve ( vars ) {
		return null;
	}

	toString ( vars ) {
		var ret = this.resolve( vars );
		if ( ret instanceof Object && ret.toString instanceof Function ) {
			return ret.toString( vars );
		}
		return String( ret );
	}
}

module.exports = DeferredYaml;