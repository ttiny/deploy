"use strict";

var ChildProcess = require( 'child_process' );

class Docker {

	constructor ( project, data ) {
		this._project = project;
		this._data = data;
		this._image = null;
		this._path = null;
		this._file = null;
	}

	Build ( argv ) {
		var options = { stdio: 'inherit' };
		var args = [ 'build', '--force-rm', '-t', this._image ];
		if ( this._file ) {
			args.push( '-f', this._file );
		}
		if ( argv[ 'no-cache' ] ) {
			args.push( '--no-cache' );
		}
		if ( argv[ 'pull' ] ) {
			args.push( '--pull' );
		}
		args.push( this._path );
		var ret = Docker.spawn( 'docker', args, options );
		return ret.status === 0;
	}

	Push ( argv ) {
		var options = { stdio: 'inherit' };
		var args = [ 'push', this._image ];
		var ret = Docker.spawn( 'docker', args, options );
		return ret.status === 0;
	}

	enter () {

		var vars = this._project.getVars();
		this._image = vars.render( yaml( this._data.image, vars ) );
		this._path = vars.render( yaml( this._data.path, vars ) );
		if ( this._data.file ) {
			this._file = vars.render( yaml( this._data.file, vars ) );
		}

	}

	exit () {
	}

	static spawn ( cmd, args, options ) {
		console.log( cmd, args.join( ' ' ) );
		return ChildProcess.spawnSync( cmd, args, options );
	}

}

module.exports = Docker;