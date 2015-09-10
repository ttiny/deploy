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
		
		this._file = vars.render( yaml( this._data.file, vars ) );
		this._vars = {};

		var rvars = yaml( this._data.vars, vars );
		if ( rvars instanceof Object ) {
			for ( var name in rvars ) {
				this._vars[ name ] = vars.render( yaml( rvars[ name ], vars ) );
			}
		}

	}

	exit () {
		// this._project.getVars().pop();
	}


}

module.exports = RockerCompose;