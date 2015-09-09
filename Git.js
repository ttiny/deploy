"use strict";

var Shelljs = require( 'shelljs' );
var ChildProcess = require( 'child_process' );
var Fs = require( 'fs' );
var Github = require( './host/Github' );

class Git {

	constructor ( vars, remote, local ) {

		remote = Git.getFullRemote( remote );
		
		this._vars = vars;
		this._branch = remote.branch;
		this._remote = remote.repo;
		this._local = local;
	}

	sync () {
		if ( this.localIsGit() ) {
			return this.pull();
		}
		else {
			return this.clone();
		}
	}

	clone () {
		Shelljs.mkdir( '-p', this._local );
		var options = { stdio: 'inherit', cwd: this._local };
		var args = [ 'clone', '--recursive', '--branch', this._branch || this._vars.get( 'branch' ), this._remote, this._local ];
		var ret = Git.spawn( 'git', args, options );
		return ret.status === 0;
	}

	pull () {
		var options = { stdio: 'inherit', cwd: this._local };

		var args = [ 'reset', '--hard' ];
		var ret = Git.spawn( 'git', args, options );
		if ( ret.status !== 0 ) {
			return false;
		}

		args = [ 'submodule', 'foreach', '--recursive', 'git', 'reset', '--hard' ]
		ret = Git.spawn( 'git', args, options );
		if ( ret.status !== 0 ) {
			return false;
		}

		// retry pulling until we delete all untracked files, if any
		var lastMatch1 = null;
		while ( true ) {

			options = { stdio: undefined, cwd: this._local };
			args = [ 'pull', '-s', 'recursive', '-X', 'theirs', 'origin', this._branch || this._vars.get( 'branch' ) ];
			ret = Git.spawn( 'git', args, options );

			
			var out = '';
			if ( ret.output ) {
				//todo: this all goes to stdout even if it is error, which is incosistent with other output which will go to stderr
				out = ret.output.join( '\n' );
				console.log( out );
			}
			
			if ( ret.status === 0 ) {
				break;
			}
			
			var match = out.match( /error: The following untracked working tree files would be overwritten by merge:\n((?:\t[^\n]+\n)*)(?=Aborting|Please move or remove them before you can merge\.)/i );
			if ( match === null ) {
				// no untracked files, then it just failed
				return false;
			}
			
			if ( match[ 1 ] === lastMatch1 ) {
				console.error( 'Some untracked files are preventing the pull and can not be deleted.' );
				return false;
			}
			lastMatch1 = match[ 1 ];

			var files = match[ 1 ].split( '\n' );
			for ( var i = files.length - 2; i >= 0; --i ) {
				var fn = files[ i ].trim();
				if ( fn.length === 0 ) {
					continue;
				}
				fn = this._local + '/' + fn;
				
				console.log( 'Removing ' + fn, '.' );
				Shelljs.rm( '-rf', fn );
			}
			console.log( 'Retrying the pull.' )
		}

		var options = { stdio: 'inherit', cwd: this._local };
		var args = [ 'submodule', 'update', '--init', '--recursive' ];
		var ret = Git.spawn( 'git', args, options );
		return ret.status === 0;
	}

	localIsGit () {
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

	static spawn ( cmd, args, options ) {
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

		remote = remote.replace( /^github(?=\/)/, Github.HostName );

		remote = remote.splitFirst( '/' );
		ret.repo = 'git@' + remote.left + ':' + remote.right + '.git';

		return ret;
	}

}

module.exports = Git;