"use strict";

var Yaml = require( 'js-yaml' );
var DeferredYaml = require( './Deferred' );
var ChildProcess = require( 'child_process' );

class If extends DeferredYaml {

	constructor ( data ) {
		super();
		var match = /[\n ]*\/ *([^ \n]+) *(==|!=) *([^\n]+) *\/[ \n]([\s\S]+)/.exec( data );
		if ( match !== null ) {
			this._left = LoadYamlString( match[ 1 ] );
			this._op = match[ 2 ];
			this._right = LoadYamlString( match[ 3 ] );
			this._then = match[ 4 ];
			this._otherwise = null;
			var match = /([\s\S]+)(?:\n\/ *else *\/[ \n]([\s\S]+))/.exec( this._then );
			if ( match !== null ) {
				this._then = LoadYamlString( match[ 1 ] );
				this._otherwise = LoadYamlString( match[ 2 ] );
			}
			else {
				this._then = LoadYamlString( this._then );
			}
		}
		else {
			throw new Exception( 'Invalid !if:\n' + data );
		}
	}
	
	resolve ( vars ) {
		if ( If.Ops[ this._op ]( vars, this._left, this._right ) ) {
			return vars.render( yaml( this._then, vars ) );
		}
		else if ( this._otherwise ) {
			return vars.render( yaml( this._otherwise, vars ) );
		}
	}
}

If.static( { Ops: {
	'==': function ( vars, left, right ) {
		var left = vars.render( yaml( left, vars ) );
		var right = vars.render( yaml( right, vars ) );
		return left == right;
	},

	'!=': function ( vars, left, right ) {
		var left = vars.render( yaml( left, vars ) );
		var right = vars.render( yaml( right, vars ) );
		return left != right;
	}
} } );

module.exports = new Yaml.Type( '!if', {
	
	kind: 'scalar',
	
	construct: function ( data ) {
		return new If( data );
	},
	
	instanceOf: If

} );