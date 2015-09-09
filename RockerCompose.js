"use strict";

class RockerCompose {

	constructor ( project, data ) {
		this._project = project;
		this._data = data;
		this._file = null;
		this._vars = null;
	}

	Run () {

	}

	Stop () {

	}

	enter () {

		var vars = this._project.getVars();

		// vars.push();
		
		this._file = vars.render( this._data.file );
		this._vars = {};

		var rvars = this._data.vars;
		if ( rvars instanceof Object ) {
			for ( var name in rvars ) {
				this._vars[ name ] = vars.render( rvars[ name ] );
			}
		}

	}

	exit () {
		// this._project.getVars().pop();
	}


}

module.exports = RockerCompose;