/*eslint no-negated-condition: 1*/

var date = require( '../../../node_modules/locutus/php/datetime/date' );


angular
  .module( 'app' )
  .filter( 'showTime', showTimeFilter )
  .filter( 'searchByName', searchByNameFilter )
  .filter( 'addAnchors', addAnchors );


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


function addAnchors () {
  return function filter( s ) {
    if ( s ) {
      var s2 = s;
      var url = s.match( /(((ftp|http|https?):\/\/)[\-\w@:%_\+.~#?,&\/\/=]+)|((mailto:)?[_.\w-]+@([\w][\w\-]+\.)+[a-zA-Z]{2,3})/g );
      angular.forEach( url, function forEach ( v ) {
        s2 = s2.replace( v, `<a target="_blank" href="${v}">${v}</a>` );
      });
      return s2;
    } else {
      return '';
    }
  };
}
