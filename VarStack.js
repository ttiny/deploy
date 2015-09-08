"use strict";

function VarStack () {
	this._prefix = '';
	this._names = [];
	this._levels = [];
	this._vars = [];
}

VarStack.define( {

	push: function ( name ) {
		this._levels.push( this._vars.length );
		this._names.push( name );
		this._prefix = this._names.join( '.' ) + ( this._names.length > 0 ? '.' : '' );
	},

	pop: function () {
		this._vars.length = this._levels.pop();
		this._names.pop();
		this._prefix = this._names.join( '.' ) + ( this._names.length > 0 ? '.' : '' );
	},

	get: function ( name ) {
		var vars = this._vars;
		for ( var i = vars.length - 1; i >= 0; --i ) {
			var v = vars[ i ];
			if ( v.name === name ) {
				return v.value;
			}
		}
		return undefined;
	},

	set: function ( name, value ) {
		var vars = this._vars;
		for ( var i = vars.length - 1; i >= this._levels.last; --i ) {
			var v = vars[ i ];
			if ( v.name === name ) {
				return v.value = value;
			}
		}
		return this._vars.push( { name: /*this._prefix +*/ name, value: value } );
	},

	render: function ( str ) {
		var _this = this;
		return str.replace( /\{([^}]+)\}/g, function ( match, name ) {
			return _this.get( name ) || match;
		} );
	}

} );

module.exports = VarStack;