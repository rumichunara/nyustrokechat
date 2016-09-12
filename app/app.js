// import angular from 'angular';

global.jQuery = require('../node_modules/jquery/dist/jquery.min');

require('./sweetalert.min');

require('./nyu.chat');

 
angular
  .module( 'app', [
    'ngConstants',
    'ngSanitize',
    'ngAnimate',
    'nyuChat',
  ])
  .config( appConfig );

//
// CONFIG
//

appConfig.$inject = ['$locationProvider'];

function appConfig( $locationProvider ) {
  $locationProvider.html5Mode( true );
}

//
// DEPENDENCIES
//

require( '../public/js/ngConstants.js' );
require( '../node_modules/material-design-lite/material.js' );

