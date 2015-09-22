"use strict";

var ChildProcess = require( 'child_process' );
var Mark = require( 'markup-js' );
var Fs = require( 'fs' );
var Shelljs = require( 'shelljs' );

class RockerCompose {

	constructor ( project, data ) {
		this._project = project;
		this._data = data;
		this._path = null;
		this._vars = null;
	}

	Run ( argv ) {
		if ( argv.cmd ) {
			this._vars.cmd = argv.cmd;
		}
		return this._run( 'run', argv );
	}

	Stop ( argv ) {
		return this._run( 'rm', argv );
	}

	Clean ( argv ) {
		return this._run( 'clean', argv );
	}

	_run ( cmd, argv ) {

		if ( !Fs.existsSync( this._file ) ) {
			console.error( 'Pod definition file', this._file, 'is not found.' );
			return false;
		}

		console.log( 'Using pod definition ' + this._file + '.' );
		var template = Mark.up( Fs.readFileSync( this._file, 'utf8' ), this._vars );
		var args = [ cmd, '-f', '-' ];
		if ( argv[ 'debug-pod' ] ) {
			var pvars = this._project.getVars();
			var vars = this._vars;
			console.log( '\nVars:', '\n-----' )
			for ( var name in vars ) {
				var value = vars[ name ];
				if ( value instanceof Object ) {
					console.log( name, '= >', '\n', value, '\n', pvars.render( yaml( value, pvars ) ), '\n^^^' );
				}
				else {
					console.log( name, '=', pvars.render( yaml( value, pvars ) ) );
				}
			}
			console.log( '^^^^^' );
			console.log( '\nPod definition:\n--------' );
			console.log( template, '\n^^^^^\n' );
		}
		if ( argv[ 'debug-pod' ] == 'more' ) {
			args.unshift( '-verbose' );
		}
		var options = { stdio: [ 'pipe', 'inherit', 'inherit' ], input: template, cwd: this._path };
		if ( cmd == 'run' ) {
			this._createVolumes( template );
		}
		var ret = RockerCompose.spawn( 'rocker-compose', args, options );
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

	static spawn ( cmd, args, options ) {
		console.log( cmd, args.join( ' ' ) );
		return ChildProcess.spawnSync( cmd, args, options );
	}


}

module.exports = RockerCompose;