"use strict";

var ChildProcess = require( 'child_process' );

class RockerCompose {

	constructor ( project, data ) {
		this._project = project;
		this._data = data;
		this._path = null;
		this._vars = null;
	}

	Run () {
		return this._run( 'run' );
	}

	Stop () {
		return this._run( 'rm' );
	}

	_run ( cmd ) {
		var options = { stdio: 'inherit', cwd: this._path };
		var args = [ cmd ];
		if ( this._file ) {
			args.push( '-f', this._file );
		}
		var vars = this._vars;
		for ( var name in vars ) {
			args.push( '-var', name + '=' + vars[ name ] );
		}
		var ret = RockerCompose.spawn( 'rocker-compose', args, options );
		return ret.status === 0;
	}

	enter () {

		var vars = this._project.getVars();

		this._path = vars.render( yaml( this._data.path, vars ) );
		if ( this._data.file ) {
			this._file = vars.render( yaml( this._data.file, vars ) );
		}
		else {
			this._file = this._path + '/compose.yml';
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

	static spawn ( cmd, args, options ) {
		console.log( cmd, args.join( ' ' ) );
		return ChildProcess.spawnSync( cmd, args, options );
	}


}

module.exports = RockerCompose;