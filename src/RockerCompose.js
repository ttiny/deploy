"use strict";

var ChildProcess = require( 'child_process' );
var Fs = require( 'fs' );
var Shelljs = require( 'shelljs' );

class RockerCompose {

	constructor ( project, data ) {
		this._project = project;
		this._data = data;
		this._path = null;
		this._vars = null;
	}

	Run () {
		var argv = this._project.getApp().getArgv();
		if ( argv.cmd ) {
			this._vars.cmd = argv.cmd;
		}
		return this._run( 'run' );
	}

	Stop () {
		return this._run( 'rm' );
	}

	Clean () {
		return this._run( 'clean' );
	}

	_run ( cmd ) {

		var argv = this._project.getApp().getArgv();

		if ( !Fs.existsSync( this._file ) ) {
			console.error( 'Pod definition file', this._file, 'is not found.' );
			return false;
		}

		// console.log( 'Using pod definition ' + this._file + '.' );
		var args = [ cmd, '-f', this._file ];
		for ( var name in this._vars ) {
			args.push( '-var', name + '=' + this._vars[ name ] );
		}
		if ( argv[ 'debug-pod' ] == 'more' ) {
			args.unshift( '-verbose' );
		}
		if ( argv[ 'debug-pod' ] ) {
			args.push( '-print' )
			var options = { stdio: 'inherit', cwd: this._path };
			RockerCompose._spawn( 'rocker-compose', args, options );
			args.pop();
			console.log( '' );
		}
		if ( cmd == 'run' ) {
			var options = { stdio: undefined, cwd: this._path };
			args.push( '-print' )
			var ret = RockerCompose._spawn( 'rocker-compose', args, options, !argv[ 'debug-pod' ] );
			if ( ret.status !== 0 ) {
				console.log( 'rocker-compose', args.join( ' ' ) );
				console.error( ret.output.join( '\n' ) );
				return false;	
			}
			this._createVolumes( ret.stdout.toString( 'utf8' ) );
			args.pop();
		}
		
		var options = { stdio: 'inherit', cwd: this._path };
		var ret = RockerCompose._spawn( 'rocker-compose', args, options );
		return ret.status === 0;
	}

	_createVolumes ( template ) {
		var pod = yaml( LoadYamlString( template ), this._project.getVars() );
		for ( var containerName in pod.containers ) {
			var container = pod.containers[ containerName ];
			var volumes = container.volumes;
			if ( String.isString( volumes ) ) {
				volumes = [ volumes ];
			}
			if ( volumes instanceof Array ) {
				for ( var i = volumes.length - 1; i >= 0; --i ) {
					var hostDir = volumes[ i ].splitFirst( ':' ).left;
					if ( !Fs.existsSync( hostDir ) ) {
						console.log( 'Creating volume directory', hostDir, '.' );
						Shelljs.mkdir( '-p', hostDir );
					}
				}
			}
		}
	}

	enter () {

		var vars = this._project.getVars();

		this._path = vars.render( yaml( this._data.path, vars ) );
		if ( this._data.file ) {
			this._file = this._path + '/' + vars.render( yaml( this._data.file, vars ) );
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

	static _spawn ( cmd, args, options, silent ) {
		if ( !silent ) {
			console.log( cmd, args.join( ' ' ) );
		}
		return ChildProcess.spawnSync( cmd, args, options );
	}


}

module.exports = RockerCompose;