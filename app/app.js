// import angular from 'angular';

global.jQuery = require('../node_modules/jquery/dist/jquery.min');

require('./angular-nicescroll');

require('./nyu.chat');

 
angular
  .module( 'app', [
    'ngConstants',
    'ngSanitize',
    'ngAnimate',
    'ngNiceScroll',
    'nyuChat',
  ])
  .animation( '.view-content', appAnimation )
  .config( appConfig )
  .run( appRun );

//
// ANIMATION
//

appAnimation.$inject = ['$rootScope', '$state'];

function appAnimation( $rootScope, $state ) {
  function resetTweenProps( element, done ) {
    //this is needed to make fixed elements work after the animations
    TweenMax.set( element, {
      clearProps: 'all',
    });

    done();
  }

  function getTweenOptions( element, done ) {
    var options = {
      opacity: 0,
      onComplete: function complete() {
        resetTweenProps( element, done );
      },
    };

    if ( $state.current.name !== 'loading' ) {
      options.y = '-100';
    }

    return options;
  }

  return {
    enter: function enter( element, done ) {
      TweenMax.from( element, 1, getTweenOptions( element, done ) );
    },
  };
}

//
// CONFIG
//

appConfig.$inject = ['$locationProvider'];

function appConfig( $locationProvider ) {
  $locationProvider.html5Mode( true );
}

//
// RUN
//

function appRun() {
}

//
// DEPENDENCIES
//

require( '../public/js/ngConstants.js' );
// require( './custom/templates' );
// require( 'organisms/loader/loader.directive' );
require( '../node_modules/material-design-lite/material.js' );

