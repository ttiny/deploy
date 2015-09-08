"use strict";

var LoggedHttpAppRequest = require( 'Logging/LoggedHttpAppRequest' );

function DeployRequest ( app, req, res ) {
	LoggedHttpAppRequest.call( this, app, req, res )
}

DeployRequest.extend( LoggedHttpAppRequest );

module.exports = DeployRequest;