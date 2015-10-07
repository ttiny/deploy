"use strict";

var Domain = require( 'domain' );

var Snappy = null;
try { Snappy = require( 'snappy' ); }
catch ( e ) {}
var Zlib = require( 'zlib' );


class HttpAppRequest {
	
	constructor ( app, req, res ) {
		this._app = app;
		this._request = req;
		this._response = res;
		this._domain = Domain.create();
		this._domain.add( req );
		this._domain.add( res );

		this._onResponseEnd = this.dispose.bind( this );
		this._onDomainError = this.onError.bind( this );

		this._response.once( 'finish', this._onResponseEnd );
		this._response.once( 'close', this._onResponseEnd );
		this._domain.on( 'error', this._onDomainError );
		
		var _this = this;
		// run this on the next tick so the registerRequest() call that leads here is done and no GC problems and other problems
		process.nextTick( _ => _this._domain.run( _this.onHttpHeaders.bind( _this ) ) );
		
	}

	getDomain () {
		return this._domain;
	}

	getRequest () {
		return this._request;
	}

	getResponse () {
		return this._response;
	}

	getApp () {
		return this._app;
	}

	dispose () {
		if ( this._domain ) {
			this._app.unregisterRequest( this );
			this._domain.removeListener( 'error', this._onDomainError );
			this._domain.remove( this._request );
			this._domain.remove( this._response );
			this._domain = null;
		}
	}

	onHttpContent () {
		throw new Error( 'HttpAppRequest.onHttpContent() not implemented.' );
	}

	onHttpError ( err ) {
	}

	onHttpHeaders () {
		var _this = this;
		var chunks = [];
		this._request.on( 'data', function( chunk ) {
			chunks.push( chunk );
		} );

		this._request.on( 'error', function ( err ) {
			_this.onHttpError( err );
		} );

		this._request.on( 'end', function () {
			var content = Buffer.concat( chunks );
			chunks = null;

			var encoding = _this._request.headers[ 'content-encondig' ];
		
			if ( encoding === 'gzip'  ) {
				Zlib.gunzip( content, function ( err, decompressed ) {
					_this.onHttpContent( err ? content : decompressed );
				} );
			}
			else if ( encoding === 'deflate'  ) {
				Zlib.inflate( content, function ( err, decompressed ) {
					_this.onHttpContent( err ? content : decompressed );
				} );
			}
			else if ( encoding === 'snappy' && Snappy ) {
				Snappy.decompress( content, function ( err, decompressed ) {
					_this.onHttpContent( err ? content : decompressed );
				} );
			}
			else {
				_this.onHttpContent( content );
			}
		} );

	}

	onError ( err ) {
		console.error( err.stack );
		this._app.close();
	}

}

module.exports = HttpAppRequest;
