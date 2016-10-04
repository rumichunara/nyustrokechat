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
      var url = s.match( /((?:(http|https|Http|Https|rtsp|Rtsp):\/\/(?:(?:[a-zA-Z0-9\$\-\_\.\+\!\*\'\(\)\,\;\?\&\=]|(?:\%[a-fA-F0-9]{2})){1,64}(?:\:(?:[a-zA-Z0-9\$\-\_\.\+\!\*\'\(\)\,\;\?\&\=]|(?:\%[a-fA-F0-9]{2})){1,25})?\@)?)?((?:(?:[a-zA-Z0-9][a-zA-Z0-9\-]{0,64}\.)+(?:(?:aero|arpa|asia|a[cdefgilmnoqrstuwxz])|(?:biz|b[abdefghijmnorstvwyz])|(?:cat|com|coop|c[acdfghiklmnoruvxyz])|d[ejkmoz]|(?:edu|e[cegrstu])|f[ijkmor]|(?:gov|g[abdefghilmnpqrstuwy])|h[kmnrtu]|(?:info|int|i[delmnoqrst])|(?:jobs|j[emop])|k[eghimnrwyz]|l[abcikrstuvy]|(?:mil|mobi|museum|m[acdghklmnopqrstuvwxyz])|(?:name|net|n[acefgilopruz])|(?:org|om)|(?:pro|p[aefghklmnrstwy])|qa|r[eouw]|s[abcdeghijklmnortuvyz]|(?:tel|travel|t[cdfghjklmnoprtvwz])|u[agkmsyz]|v[aceginu]|w[fs]|y[etu]|z[amw]))|(?:(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[1-9])\.(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[1-9]|0)\.(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[1-9]|0)\.(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[0-9])))(?:\:\d{1,5})?)(\/(?:(?:[a-zA-Z0-9\;\/\?\:\@\&\=\#\~\-\.\+\!\*\'\(\)\,\_])|(?:\%[a-fA-F0-9]{2}))*)?(?:\b|$)/gi );
      angular.forEach( url, function forEach ( v ) {
        var l = v.toLowerCase();
        if ( !l.startsWith( 'http://' ) && !l.startsWith( 'https://' ) && !l.startsWith( 'rtsp://' ) ) {
          s2 = s2.replace( v, `<a target="_blank" href="http://${l}">${v}</a>` );
        } else {
          s2 = s2.replace( v, `<a target="_blank" href="${v}">${v}</a>` );
        }
      });
      return s2;
    } else {
      return '';
    }
  };
}
