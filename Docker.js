"use strict";

class Docker {

	constructor ( project, data ) {
		this._project = project;
		this._data = data;
		this._image = null;
		this._file = null;
	}

	Build () {

	}

	Push () {

	}

	enter () {

		var vars = this._project.getVars();

		// vars.push();

		this._image = vars.render( this._data.image );
		this._file = vars.render( this._data.file );

	}

	exit () {
		// this._project.getVars().pop();
	}

}

module.exports = Docker;