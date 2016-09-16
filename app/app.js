angular
  .module( 'app', [
    'ui.router',
    'ngConstants',
    'ngSanitize',
    'ngAnimate',
    'templateCache',
  ])
  .config( appConfig );

//
// CONFIG
//

appConfig.$inject = ['$locationProvider', '$stateProvider'];

function appConfig( $locationProvider, $stateProvider ) {
  $locationProvider.html5Mode( true );
  
  var homeState = {
    name: 'home',
    url: '/',
    templateUrl: 'templates/home/template.html',
  };

  var authenticationState = {
    name: 'authentication',
    url: '/authenticate',
    templateUrl: 'templates/authentication/template.html',
  };

  $stateProvider.state( homeState );
  $stateProvider.state( authenticationState );
  
}

//
// DEPENDENCIES
//
global.jQuery = require( '../node_modules/jquery/dist/jquery.min' );
require( '../public/js/ngConstants.js' );
require( '../node_modules/material-design-lite/material.js' );
require( '../node_modules/angular-ui-router' );
require( './firebase.service' );
require( './templates' ); 

