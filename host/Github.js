"use strict";

var GithubApi = require( 'github' );

class Github {

	constructor ( user, auth ) {

		this._api = new GithubApi( { version: "3.0.0" } );
		
		if ( auth && auth.token ) {
			this._api.authenticate( { type: 'oauth', token: auth.token } );
		}
		else if ( auth && auth.username && auth.password ) {
			this._api.authenticate( { type: 'basic', username: auth.username, password: auth.password } );
		}
	}

	getRepos ( callback ) {
		var client = this._api;
		var allrepos = [];

		function handler ( err, repos ) {
			if ( repos ) {
				for ( var i = repos.length - 1; i >= 0; --i ) {
					repos[ i ] = repos[ i ].full_name;
				}
				allrepos = allrepos.concat( repos );
			}
			if ( err || !client.hasNextPage( repos ) ) {
				callback( err, allrepos );
				return;
			}
			client.getNextPage( repos, handler );

		}

		this._api.repos.getAll( {}, handler );
	}

	getBranches ( repo, callback ) {
		repo = repo.splitFirst( '/' );
		var client = this._api;
		var allbranches = [];

		function handler ( err, branches ) {
			if ( branches ) {
				for ( var i = branches.length - 1; i >= 0; --i ) {
					branches[ i ] = branches[ i ].name;
				}
				allbranches = allbranches.concat( branches );
			}
			if ( err || !client.hasNextPage( branches ) ) {
				callback( err, allbranches );
				return;
			}
			client.getNextPage( branches, handler );
		}

		this._api.repos.getBranches( { user: repo.left, repo: repo.right }, handler );
	}

	static parseRequest ( headers, content ) {
		var ret = {
			action: null,
			target: null,
			repo: null,
			branch: null,
			tag: null
		};

		if ( headers[ 'X-GitHub-Event'.toLowerCase() ] !== 'push' ) {
			return null;
		}

		var payload = null;
		try {
			payload = JSON.parse( content );
		}
		catch ( e ) {
			return null;
		}

		if ( !(payload instanceof Object) ) {
			return null;
		}
		
		if ( payload.repository && payload.repository.full_name ) {
			ret.repo = 'repo:github/' + payload.repository.full_name;
		}
		else {
			return null;
		}

		if ( payload.ref ) {
			var ref = payload.ref.split( '/' );
			if ( ref[ ref.length - 2 ] !== 'heads' ) {
				ret.target = 'tag';
			}
			else {
				ret.target = 'branch';
			}
			ret[ ret.target ] = ref.last;
		}
		else {
			return null;
		}

		if ( payload.deleted === true ) {
			ret.action = 'clean';
		}
		else {
			ret.action = 'sync';
		}

		return ret;
		
	}

}

Github.static( {

	HostName: 'github.com'

} );

module.exports = Github;