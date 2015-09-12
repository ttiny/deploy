"use strict";

var HttpApp = require( '../HttpApp' );
var HttpAppRequest = require( '../HttpAppRequest' );
var HttpRequest = require( 'Net/HttpRequest' );

UnitestA( 'HttpAppRequest.onHttpContent', function ( test ) {

	class TestAppRequest extends HttpAppRequest {
		constructor ( app, req, res ) {
			super( app, req, res );
		}

		onHttpContent ( content ) {
			test( this.Request.headers.someting === 'custom' );
			test( content.toString() === 'asd.qwe' );
			this.Response.end();
			this.App.close( function () {
				test.out();
			} );
		}
	}

	var app1 = new HttpApp( TestAppRequest, '127.0.0.1', 55555 );
	app1.startListening();
	(new HttpRequest( 'http://127.0.0.1:55555' ))
		.setHeader( 'someting', 'custom' )
		.send( 'asd.qwe' );

} );

UnitestA( 'Parallel domain handling', function ( test ) {

	var nreq = 0;
	var nerr = 0;

	class TestAppRequest extends HttpAppRequest {
		constructor ( app, req, res ) {
			super( app, req, res );
		}

		onHttpContent ( content ) {
			this.Request.content = content;
			++nreq;
			if ( nreq === 1 ) {
				setTimeout( function () {
					throw new Error( '1' );
				}, 100 );
			}
			else if ( nreq === 2 ) {
				setTimeout( function () {
					process.nextTick( function () {
						throw new Error( '2' );
					} );
				}, 50 );	
			}
			else if ( nreq === 3 ) {
				throw new Error( '3' );
			}
		}

		onError ( err ) {
			++nerr;
			this.Response.end();
			if ( nerr === 1 ) {
				test( err.message === '3' );
				test( this.Request.content.toString() === '333' );
				this.App.close( function () {
					test.out();
				} );
			}
			else if ( nerr === 2 ) {
				test( err.message === '2' );
				test( this.Request.content.toString() === '222' );
			}
			else if ( nerr === 3 ) {
				test( err.message === '1' );
				test( this.Request.content.toString() === '111' );
			}
		}
	}

	var app1 = new HttpApp( TestAppRequest, '127.0.0.1', 55555 );
	app1.startListening();
	(new HttpRequest( 'http://127.0.0.1:55555' )).send( '111' );
	(new HttpRequest( 'http://127.0.0.1:55555' )).send( '222' );
	(new HttpRequest( 'http://127.0.0.1:55555' )).send( '333' );
} );
