/* eslint angular/log: 0 */
/* eslint no-console: 0 */

// Requirements
var bodyParser = require( 'body-parser' );
var express = require( 'express' );
var firebase = require( 'firebase' );
var postmark = require( 'postmark' );
var fs = require( 'fs' );


// Initialization
var app = express();

// Let's use Body Parser for reading POST parameters
app.use( bodyParser.json() );
app.use( bodyParser.urlencoded({ extended: true }) ); 

// Let's specify where static files are.
// There is an index file here so we don't need to specify the default rute.
app.use( express.static( 'public' ) );

// Let's initialize Firebase
firebase.initializeApp({
  serviceAccount: './FirebaseCredentials.json',
  databaseURL: 'https://nyu-chat.firebaseio.com',
});

// Let's specify the Postmark key
var client = new postmark.Client( '3fa4d202-2136-4f4b-a894-0e6977fcd92d' );


// Now, let's do something about each route

// Requesting to send an invitation
app.post( '/send_invitation', function onRequest ( req, res ) {
  // Let's check we have all the parameters needed
  if ( req.body && req.body.idToken && req.body.email ) {
    // Let's verify it is a logged-in user
    firebase.auth().verifyIdToken( req.body.idToken ).then( function onTokenVerified () {
      // Lets build the invitation
      fs.readFile( './app/templates/invitation/invitation_email.html', 'utf8', function onFileRead ( err, fileData ) {
        // Send the invitation
        client.sendEmail({
          'From': 'no-reply@brgnyc.com',
          'To': req.body.email,
          'Subject': 'You have been invited to the NYU Chat', 
          'HtmlBody': fileData,
        });
        // Let's log this
        console.log( `Invitation sent to ${ req.body.email } on ${ new Date() }` );
        // Return the response to the browser
        res.status( 200 ).end( '' );
      });
    }).catch( function onTokenError () {
      // The Id verification did not pass. 
      // Should not happen, let's not give clues.
      res.status( 500 ).send( 'Internal Server Error' );
    });
  } else {
    // Some parameter is missing.
    // Should not happen, let's not give clues.
    res.status( 500 ).send( 'Internal Server Error' );
  }
});


// Redirect if there is a direct access to /authenticate
app.get( '/authenticate', function( req, res ) {
  res.redirect( '/' );
});

// Let's start listening
app.listen( 8000, function onListening () { 
  console.log( 'NYU Chat app running...' );
});
