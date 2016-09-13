var date = require( '../node_modules/locutus/php/datetime/date' );


angular
  .module('app')
  .filter('showTime', showTimeFilter);
  

showTimeFilter.$inject = [];

function showTimeFilter() {
  return function(a) {
    var d = new Date(a);
    var s = '';
    if (date('m-d', d) != date('m-d'))
      s += date('M j');
    if (date('Y', d) != date('Y'))
      s += ((s != '') ? ', ' : '') + date('Y');
    return ((s != '') ? ' - ' : '') + date('H:i', d);
  };
}
