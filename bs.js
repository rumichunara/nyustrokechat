var browserSync = require("browser-sync").create();
var historyApiFallback = require('connect-history-api-fallback');
var firebase = require("firebase");
var postmark = require("postmark");
var fs = require('fs');

firebase.initializeApp({
  serviceAccount: "./FirebaseCredentials.json",
  databaseURL: "https://nyu-chat.firebaseio.com"
});

var client = new postmark.Client("3fa4d202-2136-4f4b-a894-0e6977fcd92d");


browserSync.init({
  files: ["public/*.html", "public/css/*.css", "public/js/*.js"],
  port: 8000,
  server: {
    baseDir: "public",
    middleware: [ historyApiFallback() ]
  },
  middleware: [ {
    route: "/api/send_invitation",
    handle: function (request, response, next) {
      if(request.method == 'POST') {
          var body = '';

          request.on('data', function (data) {
              body += data;

              // Too much POST data, kill the connection!
              // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
              if (body.length > 1e6)
                  request.connection.destroy();
          });

          request.on('end', function () {
              var post = JSON.parse(body);
              
              // Verify it is alogged in user
              firebase.auth().verifyIdToken(post.idToken).then(function(decodedToken) {
                // Lets build the invitation
                fs.readFile('./app/templates/invitation/invitation_email.html', 'utf8', function(err, data) {
                  client.sendEmail({
                    "From": "no-reply@brgnyc.com",
                    "To": post.email,
                    "Subject": "You've been invited to the NYU Chat", 
                    "HtmlBody": data
                  });
                });
              });
          });
      }
      response.writeHead(200, {'Content-Type': 'text/html'});
      response.end('done');
    }
  }]
});