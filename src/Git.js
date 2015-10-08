"use strict";

var Shelljs = require( 'shelljs' );
var Fs = require( 'fs' );
var Github = require( './host/Github' );

class Git {

	constructor ( remote, local, tag ) {

		remote = Git.getFullRemote( remote );
		
		this._branch = remote.branch;
		this._remote = remote.repo;
		this._local = local;
		this._isTag = tag;
	}

	sync () {
		console.info( 'Local repo directory is', this._local );
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
				console.info( 'Local directory is not empty for clone. Trying init.' );
				isEmpty = false;
				// this will happen for non-empty dir, in which case git clone will also fail
			}
		}
		Shelljs.mkdir( '-p', this._local );

		var options = { /*stdio: 'inherit',*/ cwd: this._local };
		if ( !isEmpty ) {
			var args = [ 'init' ];
			var ret = console.spawn( 'git', args, options );
			if ( ret.status === 0 ) {

				var args = [ 'remote', 'add', 'origin', this._remote ];
				var ret = console.spawn( 'git', args, options );

				if ( ret.status === 0 ) {
					var args = [ 'fetch'/*, '--depth=1'*/ ];
					var ret = console.spawn( 'git', args, options );

					if ( ret.status === 0 ) {
						var ret = this._cmdWithUntrackedFiles( [ 'checkout', ( this._isTag ? 'tags/' : 'origin/' ) + this._branch ] );
						if ( ret === true ) {
							return true;
						}
					}
				}
			}
		}

		var options = { /*stdio: undefined,*/ cwd: this._local };
		var args = [ 'clone', /*'--depth', '1',*/ '--recursive', '--branch', this._branch, this._remote, this._local ];
		var ret = console.spawn( 'git', args, options );

		var out = '';
		if ( ret.output ) {
			//todo: this all goes to stdout even if it is error, which is incosistent with other output which will go to stderr
			out = ret.output.join( '\n' );
		}

		if ( out.indexOf( 'Permission denied (publickey).' ) > 0 ) {
			this._checkAuthentication();
		}

		return ret.status === 0;
	}

	pull () {

		// check if the local matches remote or we have different project
		var options = { /*stdio: undefined,*/ cwd: this._local };
		var args = [ 'remote', '-v' ];
		var ret = console.spawn( 'git', args, options );
		if ( ret.status !== 0 ) {
			return false;
		}

		var out = ret.output.join( '\n' );

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
			console.error( 'Repo origin mismatch: expected', this._remote, 'but found', match[ 1 ], 'in', this._local + '.' );
			return false;
		}

		///

		if ( !this._reset() ) {
			return false;
		}

		var options = { /*stdio: 'inherit',*/ cwd: this._local };
		var args, ret;

		if ( this._isTag ) {
			// for some reason pulling a tag fails without this
			args = [ 'config', '--global', 'user.email', 'user@email.com' ];
			console.spawn( 'git', args, options );

			// fetch tags since if new tag is added on the remote for the history we have and we don't have the tag, it won't work
			args = [ 'fetch', '--tags' ];
			console.spawn( 'git', args, options );
		}

		ret = this._cmdWithUntrackedFiles( [ 'pull', '-s', 'recursive', '-X', 'theirs', /*'--depth=1',*/ 'origin', this._branch ] );
		if ( ret === false ) {
			return false;
		}

		if ( this._isTag ) {
			// since if we already have the tag pull will do nothing - checkout
			ret = this._cmdWithUntrackedFiles( [ 'checkout', 'tags/' + this._branch ] );
			if ( ret === false ) {
				return false;
			}
			
			// since the tag may not be at the end of the branch reset to clean extra files and stuff
			if ( !this._reset() ) {
				return false;
			}
		}

		options = { /*stdio: 'inherit',*/ cwd: this._local };
		args = [ 'submodule', 'update', '--init', '--recursive' ];
		ret = console.spawn( 'git', args, options );
		return ret.status === 0;
	}

	_reset () {
		var options = { /*stdio: 'inherit',*/ cwd: this._local };
		var args = [ 'reset', '--hard' ];
		var ret = console.spawn( 'git', args, options );
		if ( ret.status !== 0 ) {
			return false;
		}

		args = [ 'submodule', 'foreach', '--recursive', 'git', 'reset', '--hard' ]
		ret = console.spawn( 'git', args, options );
		if ( ret.status !== 0 ) {
			return false;
		}

		return true;
	}

	_checkAuthentication () {
		console.info( 'Check your authentication:' );
		var options = { /*stdio: 'inherit',*/ cwd: this._local };
		var args = [ '-T', this._remote.splitFirst( ':' ).left ];
		var ret = console.spawn( 'ssh', args, options );
		return ret.status === 0;	
	}

	_cmdWithUntrackedFiles ( args ) {
		// retry pulling until we delete all untracked files, if any
		var options = { /*stdio: undefined,*/ cwd: this._local };
		var lastMatch1 = null;
		while ( true ) {

			var ret = console.spawn( 'git', args, options );
			
			var out = '';
			if ( ret.output ) {
				//todo: this all goes to stdout even if it is error, which is incosistent with other output which will go to stderr
				out = ret.output.join( '\n' );
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
				.map( it => it.trim() )
				.filter( ( file ) => {
					return file.length > 0;
				} )
				.map( ( fn ) => {
					return local + fn;
				} );

			console.info( 'Removing ' + files.join( ', ' ) + '.' );
			Shelljs.rm( '-rf', files );

			console.info( 'Retrying the sync.' )
		}

		return true;
	}

	_localIsGit () {
		var fn = this._local + '/.git';
		return Fs.existsSync( fn ) && Fs.statSync( fn ).isDirectory();
	}

	clean () {
		console.info( 'Removing', this._local + '...' );
		Shelljs.rm( '-rf', this._local );
		if ( Fs.existsSync( this._local ) ) {
			console.warn( 'Failed to clean the local directory.' );
			return false;
		}

		return true;
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