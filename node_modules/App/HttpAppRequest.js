"use strict";

var Domain = require( 'domain' );

var Snappy = null;
try { Snappy = require( 'snappy' ); }
catch ( e ) {}
var Zlib = require( 'zlib' );


class HttpAppRequest {
	
	constructor ( app, req, res ) {
		this.App = app;
		this.Request = req;
		this.Response = res;
		this.Domain = Domain.create();
		this.Domain.add( req );
		this.Domain.add( res );

		this._onResponseClose = this.dispose.bind( this );
		this._onDomainError = this.onError.bind( this );

		this.Response.once( 'close', this._onResponseClose );
		this.Domain.on( 'error', this._onDomainError );
		
		this.Domain.run( this.onHttpHeaders.bind( this ) );
	}

	dispose () {
		if ( this.Domain ) {
			this.App.unregisterRequest( this );
			this.Domain.removeListener( 'error', this._onDomainError );
			this.Domain.remove( this.Request );
			this.Domain.remove( this.Response );
			this.Domain = null;
		}
	}

	onHttpContent () {
		throw new Error( 'HttpAppRequest.onHttpContent() not implemented.' );
	}

	onHttpHeaders () {
		var _this = this;
		var chunks = [];
		this.Request.on( 'data', function( chunk ) {
			chunks.push( chunk );
		} );

		this.Request.on( 'end', function () {
			var content = Buffer.concat( chunks );
			chunks = null;

			var encoding = _this.Request.headers[ 'content-encondig' ];
		
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
		this.App.close();
	}

}

module.exports = HttpAppRequest;
