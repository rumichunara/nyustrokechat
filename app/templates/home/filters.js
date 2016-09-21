/*eslint no-negated-condition: 1*/

var date = require( '../../../node_modules/locutus/php/datetime/date' );


angular
  .module( 'app' )
  .filter( 'showTime', showTimeFilter )
  .filter( 'searchByName', searchByNameFilter );


function showTimeFilter() {
  return function filter( a ) {
    var d = new Date( a );
    var s = '';

    if ( date( 'm-d', d ) !== date( 'm-d' ) ) {
      s += date( 'M j', d );
    }

    if ( date( 'Y', d ) !== date( 'Y' ) ) {
      s += ( ( s === '' ) ? '' : ', ' ) + date( 'Y', d );
    }

    return s + ( ( s === '' ) ? '' : ' - ' ) + date( 'H:i', d );
  };
}


function searchByNameFilter () {
  return function filter( input, search ) {
    if ( !input ) {
      return input;
    }
    if ( !search ) {
      return input;
    }
    
    var expected = ( search ).toLowerCase();
    var result = {};
    
    angular.forEach( input, function forEach ( value, key ) {
      var actual = ( value.name ).toLowerCase();
      if ( actual.indexOf( expected ) !== -1 ) {
        result[key] = value;
      }
    });
    
    return result;
  };
}
