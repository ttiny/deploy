"use strict";

var ChildProcess = require( 'child_process' );
var Fs = require( 'fs' );

class Rocker {

	constructor ( project, data ) {
		this._project = project;
		this._data = data;
		this._image = null;
		this._path = null;
		this._file = null;
		this._vars = null;
	}

	Build () {
		var argv = this._project.getApp().getArgv();
		var isLocal = Fs.existsSync( this._path );
		var options = { stdio: 'inherit' };
		var isRocker = this._data.rocker === true;
		if ( isLocal ) {
			options.cwd = this._path;
			console.log( 'Local build directory is', this._path );
		}
		var args = [ 'build' ];
		if ( this._file ) {
			if ( this._file === 'Rockerfile' || this._file.endsWith( '/Rockerfile' ) ) {
				isRocker = true;
			}
			args.push( '-f', this._file );
		}
		if ( isRocker ) {
			var image = this._image.splitFirst( ':' );
			args.push( '--var', 'image=' + image.left, '--var', 'tag=' + image.right );
			for ( var name in this._vars ) {
				args.push( '--var', name + '=' + this._vars[ name ] );
			}
			if ( argv[ 'push' ] ) {
				args.push( '--push' );
			}
			if ( argv[ 'attach' ] ) {
				args.push( '--attach' );
			}
		}
		else {
			args.push( '--force-rm=true', '-t', this._image );
		}
		if ( argv[ 'pull' ] ) {
			args.push( '--pull' );
		}
		if ( argv[ 'no-cache' ] ) {
			args.push( '--no-cache' );
		}
		if ( isRocker && argv[ 'debug-image' ] ) {
			args.push( '--print' );
			args.push( isLocal ? '.' : this._path );
			console.log( '\nRockerfile:\n--------' );
			Rocker._spawn( 'rocker', args, options );
			console.log( '\n^^^^^\n' );
			args.pop();
			args.pop();
		}
		args.push( isLocal ? '.' : this._path );
		var ret = Rocker._spawn( isRocker ? 'rocker' : 'docker', args, options );
		return ret.status === 0;
	}

	Push () {
		var options = { stdio: 'inherit' };
		var args = [ 'push', this._image ];
		var ret = Rocker._spawn( 'docker', args, options );
		return ret.status === 0;
	}

	Clean () {
		var argv = this._project.getApp().getArgv();
		var options = { stdio: 'inherit' };
		var args = [ 'rmi' ];
		if ( argv.force ) {
			args.push( '-f' )
		}
		args.push( this._image );
		var ret = Rocker._spawn( 'docker', args, options );
		return ret.status === 0;
	}

	enter () {

		var vars = this._project.getVars();
		this._image = vars.render( yaml( this._data.image, vars ) );
		this._path = vars.render( yaml( this._data.path, vars ) );
		if ( this._data.file ) {
			this._file = vars.render( yaml( this._data.file, vars ) );
		}

		this._vars = {};

		var rvars = yaml( this._data.vars, vars );
		if ( rvars instanceof Object ) {
			for ( var name in rvars ) {
				this._vars[ name ] = vars.render( yaml( rvars[ name ], vars ) );
			}
		}

	}

	exit () {
	}

	static _spawn ( cmd, args, options ) {
		console.log( cmd, args.join( ' ' ) );
		return ChildProcess.spawnSync( cmd, args, options );
	}

}

module.exports = Rocker;