"use strict";

var Shelljs = require( 'shelljs' );
var ChildProcess = require( 'child_process' );
var Fs = require( 'fs' );
var Github = require( './host/Github' );

class Git {

	constructor ( remote, local ) {

		remote = Git.getFullRemote( remote );
		
		this._branch = remote.branch;
		this._remote = remote.repo;
		this._local = local;
	}

	sync () {
		if ( this._localIsGit() ) {
			return this.pull();
		}
		else {
			return this.clone();
		}
	}

	clone () {
		
		var isEmpty = true;
		if ( Fs.existsSync( this._local ) && Fs.statSync( this._local ).isDirectory() ) {
			try {
				Fs.rmdirSync( this._local )
			}
			catch ( e ) {
				console.log( 'Local directory is not empty for clone. Trying init.' );
				isEmpty = false;
				// this will happen for non-empty dir, in which case git clone will also fail
			}
		}
		Shelljs.mkdir( '-p', this._local );

		var options = { stdio: 'inherit', cwd: this._local };
		if ( !isEmpty ) {
			var args = [ 'init' ];
			var ret = Git._spawn( 'git', args, options );
			if ( ret.status === 0 ) {

				var args = [ 'remote', 'add', 'origin', this._remote ];
				var ret = Git._spawn( 'git', args, options );

				if ( ret.status === 0 ) {
					var args = [ 'fetch' ];
					var ret = Git._spawn( 'git', args, options );

					if ( ret.status === 0 ) {
						var ret = this._cmdWithUntrackedFiles( [ 'checkout', '-t', 'origin/' + this._branch ] );
						if ( ret === true ) {
							return true;
						}
					}
				}
			}
		}

		var options = { stdio: undefined, cwd: this._local };
		var args = [ 'clone', '--recursive', '--branch', this._branch, this._remote, this._local ];
		var ret = Git._spawn( 'git', args, options );

		var out = '';
		if ( ret.output ) {
			//todo: this all goes to stdout even if it is error, which is incosistent with other output which will go to stderr
			out = ret.output.join( '\n' );
			console.log( out );
		}

		if ( out.indexOf( 'Permission denied (publickey).' ) > 0 ) {
			this._checkAuthentication();
		}

		return ret.status === 0;
	}

	pull () {

		// check if the local matches remote or we have different project
		var options = { stdio: undefined, cwd: this._local };
		var args = [ 'remote', '-v' ];
		var ret = Git._spawn( 'git', args, options );
		if ( ret.status !== 0 ) {
			return false;
		}

		var out = ret.output.join( '\n' );
		console.log( out );

		var match = out.match( /origin\s+(\S+)\s+\(fetch\)/ );
		if ( match === null ) {
			console.error( 'Couldn\'t identify the origin to fetch from.' );
			return false;
		}

		// convert https to ssh git address
		if ( match[ 1 ].startsWith( 'https://' ) ) {
			var m = match[ 1 ].slice( 8 ).splitFirst( '/' );
			if ( m.right.endsWith( '/' ) ) {
				m.right = m.right.slice( 0, -1 );
			}
			match[ 1 ] = 'git@' + m.left + ':' + m.right + '.git';
		}

		if ( match[ 1 ] !== this._remote ) {
			console.error( 'Repo origin mismatch: expected', this._remote, 'but found', match[ 1 ], 'in', this._local, '.' );
			return false;
		}

		///

		var options = { stdio: 'inherit', cwd: this._local };
		var args = [ 'reset', '--hard' ];
		var ret = Git._spawn( 'git', args, options );
		if ( ret.status !== 0 ) {
			return false;
		}

		args = [ 'submodule', 'foreach', '--recursive', 'git', 'reset', '--hard' ]
		ret = Git._spawn( 'git', args, options );
		if ( ret.status !== 0 ) {
			return false;
		}

		var ret = this._cmdWithUntrackedFiles( [ 'pull', '-s', 'recursive', '-X', 'theirs', 'origin', this._branch ] );
		if ( ret === false ) {
			return false;
		}

		var options = { stdio: 'inherit', cwd: this._local };
		var args = [ 'submodule', 'update', '--init', '--recursive' ];
		var ret = Git._spawn( 'git', args, options );
		return ret.status === 0;
	}

	_checkAuthentication () {
		console.log( 'Check your authentication:' );
		var options = { stdio: 'inherit', cwd: this._local };
		var args = [ '-T', this._remote.splitFirst( ':' ).left ];
		var ret = Git._spawn( 'ssh', args, options );
		return ret.status === 0;	
	}

	_cmdWithUntrackedFiles ( args ) {
		// retry pulling until we delete all untracked files, if any
		var options = { stdio: undefined, cwd: this._local };
		var lastMatch1 = null;
		while ( true ) {

			var ret = Git._spawn( 'git', args, options );
			
			var out = '';
			if ( ret.output ) {
				//todo: this all goes to stdout even if it is error, which is incosistent with other output which will go to stderr
				out = ret.output.join( '\n' );
				console.log( out );
			}
			
			if ( ret.status === 0 ) {
				break;
			}

			if ( out.indexOf( 'Permission denied (publickey).' ) > 0 ) {
				this._checkAuthentication();
			}

			var match = out.match( /error: The following untracked working tree files would be overwritten by (?:merge|checkout):\n((?:\t[^\n]+\n)*)(?=Aborting|Please move or remove them before you can (?:merge|switch branches)\.)/i );
			if ( match === null ) {
				match = out.match( /error: Untracked working tree file '([^\n]+)' would be overwritten by merge\./i );

				if ( match === null ) {
					// no untracked files, then it just failed
					return false;
				}
			}

			if ( match[ 1 ] === lastMatch1 ) {
				console.error( 'Some untracked files are preventing the sync and can not be deleted.' );
				return false;
			}

			lastMatch1 = match[ 1 ];

			var local = this._local + '/';
			var files = match[ 1 ]
				.split( '\n' )
				.map( 'trim' )
				.filter( ( file ) => {
					return file.length > 0;
				} )
				.map( ( fn ) => {
					return local + fn;
				} );

			console.log( 'Removing ' + files.join( ', ' ) + '.' );
			Shelljs.rm( '-rf', files );

			console.log( 'Retrying the sync.' )
		}

		return true;
	}

	_localIsGit () {
		var fn = this._local + '/.git';
		return Fs.existsSync( fn ) && Fs.statSync( fn ).isDirectory();
	}

	clean () {
		console.log( 'Removing ' + this._local, '...' );
		Shelljs.rm( '-rf', this._local );
		if ( Fs.existsSync( this._local ) ) {
			console.error( 'Failed to clean the local directory.' );
			return false;
		}

		return true;
	}

	static _spawn ( cmd, args, options ) {
		console.log( cmd, args.join( ' ' ) );
		return ChildProcess.spawnSync( cmd, args, options );
	}

	static getFullRemote ( remote ) {
		// check if we have url like github/user/repo#branch

		var ret = { repo: null, branch: null };

		var branch = remote.splitLast( '#' );
		if ( branch.right ) {
			remote = branch.left;
			ret.branch = branch.right;
		}

		if ( remote.startsWith( 'git@' ) ) {
			ret.repo = remote;
			return ret;
		}

		remote = remote.replace( /^github(?=\/)/, Github.HostName );

		remote = remote.splitFirst( '/' );
		ret.repo = 'git@' + remote.left + ':' + remote.right + '.git';

		return ret;
	}

}

module.exports = Git;