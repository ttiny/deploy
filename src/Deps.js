"use strict";

class Deps {
	
	constructor ( project, data ) {

		this._project = project;
		this._data = data;
		this._deps = {};
		this._current = project.getName() + '#' + project.getCurrentBranch();

		if ( !(data instanceof Object) ) {
			return;
		}

		var vars = project.getVars();

		var all = yaml( data.all );
		if ( all instanceof Array ) {
			for ( var i = all.length - 1; i >= 0; --i ) {
				all[ i ] = vars.render( all[ i ] );
			}
		}

		var cmds = Deps.AllCmds;
		for ( var cmd of cmds ) {

			this._deps[ cmd ] = {};

			var cmdDeps = yaml( data[ cmd ], vars );
			if ( !(cmdDeps instanceof Object) && !(all instanceof Array) ) {
				continue;
			}

			// copy from "all" deps possibly replacing the command with the one in "cmd".all
			var allCmd = [ cmd ];
			if ( cmdDeps ) {
				var allAltCmd = vars.render( yaml( cmdDeps.all ) );
				if ( String.isString( allAltCmd ) ) {
					allAltCmd = allAltCmd.split( ',' ).map( it => it.trim() );
				}
				if ( allAltCmd instanceof Array ) {
					allCmd = allAltCmd;
					for ( var i = allCmd.length - 1; i >= 0; --i ) {
						allCmd[ i ] = vars.render( yaml( allCmd[ i ], vars ) );
					}
				}
			}
			if ( all instanceof Array ) {
				for ( var prj of all ) {
					this._deps[ cmd ][ prj ] = allCmd;
				}
			}

			if ( !cmdDeps ) {
				continue;
			}

			for ( var prj in cmdDeps ) {
				
				if ( prj == 'all' ) {
					continue;
				}

				// copy from the specific cmd
				var prjCmds = vars.render( yaml( cmdDeps[ prj ] ) );
				var prj = vars.render( prj );
				if ( String.isString( prjCmds ) ) {
					prjCmds = prjCmds.split( ',' ).map( it => it.trim() );
				}
				if ( prjCmds instanceof Array ) {
					this._deps[ cmd ][ prj ] = prjCmds;
				}
			}
		}
		
	}

	has ( cmd ) {
		var cmd = this._deps[ cmd ];
		return cmd instanceof Object && Object.keys( cmd ).length > 0;
	}

	exec ( cmd ) {
		if ( !this.has( cmd ) ) {
			return true;
		}
		if ( this._enter( cmd ) ) {
			return false;
		}

		console.info( '\n' + cmd.toLowerCase().toFirstUpperCase() + 'ing dependecies for', this._current + '...\n' );

		var deps = this._deps[ cmd ];
		var good = true;
		breakall: for ( var prjName in deps ) {
			var cmds = deps[ prjName ];
			var prjNameAndBranch = prjName.splitFirst( '#' );
			var app = this._project.getApp();
			var projects = app.findProjectsByName( prjNameAndBranch.left );
			for ( var project of projects ) {
				for ( var prjCmd of cmds ) {
					var branch = prjNameAndBranch.right;
					if ( branch === undefined ) {
						branch = app.getOnlyBranch( project );
					}
					if ( !String.isString( branch ) ) {
						console.warn( 'Couldn\'t auto decide appropriate branch for project', project.getName() + ', skipping.' );
						continue;
					}
					good = app.doSingleAction( prjCmd.toLowerCase().toFirstUpperCase(), project, branch );
					if ( !good ) {
						break breakall;
					}
				}
			}
		}

		this._exit( cmd );
		return good;
	}

	list ( cmd, list ) {
		if ( !this.has( cmd ) ) {
			return true;
		}
		if ( this._enter( cmd ) ) {
			return false;
		}

		var deps = this._deps[ cmd ];
		var good = true;
		for ( var prjName in deps ) {
			var cmds = deps[ prjName ];
			var subdeps = {};

			var prjNameAndBranch = prjName.splitFirst( '#' );
			var app = this._project.getApp();
			var projects = app.findProjectsByName( prjNameAndBranch.left );
			for ( var project of projects ) {
				var branch = prjNameAndBranch.right;
				if ( branch === undefined ) {
					branch = app.getOnlyBranch( project );
				}
				if ( !String.isString( branch ) ) {
					console.warn( 'Couldn\'t auto decide appropriate branch for project', project.getName() + ', skipping.' );
					continue;
				}
				project.enter( branch );
				var sub = (subdeps[ prjName ] = {});
				good = project.listDeps( cmds, sub );
				if ( Object.keys( sub ).length == 0 ) {
					subdeps[ prjName ] = cmds.join( ', ' );
				}
				project.exit();
			}

			if ( Object.keys( subdeps ).length > 0 ) {
				if ( list[ cmd ] === undefined ) {
					list[ cmd ] = [ subdeps ];
				}
				else {
					list[ cmd ].push( subdeps );
				}
			}
			else {
				list[ cmd ] = cmds.join( ', ' );
			}

			if ( !good ) {
				break;
			}
		}

		this._exit( cmd );
		return good;
	}

	_enter ( cmd ) {
		var current = this._current + ' ' + cmd;
		var depsCtx = this._project.getApp().getDepsCtx();
		depsCtx[ '#stack' ].push( current );
		
		if ( depsCtx[ current ] ) {
			console.error( 'Circular project dependency', current + '.\n' + depsCtx[ '#stack' ].join( ' --> ' ), '\n' );
			return true;
		}
		depsCtx[ current ] = true;
		return false;
	}

	_exit ( cmd ) {
		var current = this._current + ' ' + cmd;
		var depsCtx = this._project.getApp().getDepsCtx();
		depsCtx[ '#stack' ].pop();
		delete depsCtx[ current ];
	}
}

Deps.static( {
	AllCmds: [ 'sync', 'clean', 'build', 'push', 'rmi', 'run', 'stop' ]
} );

module.exports = Deps;