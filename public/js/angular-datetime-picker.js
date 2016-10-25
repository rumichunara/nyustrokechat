require( './bootstrap-datetimepicker.js' );


angular.module('ngDateTimePicker', [])

.directive('dtPicker', function(){
    return {
        require : '?ngModel',
        restrict: 'A',
        scope: {
            viewMode: '@',
            format: '@',
            inline: '@'
        },
        link: function(scope, element, attrs, ngModel){
            jQuery(element).datetimepicker({
                viewMode: scope.viewMode,
                format: scope.format,
                inline: (scope.inline == 'true'),
                onChange: function (e) {
                  // datepick doesn't update the value of the ng-model when the date is changed
                  // when date changed event is triggered 
                  // retreive the value of the new date
                  // set the value to the ng-model 
                  ngModel.$setViewValue(jQuery(element).val());
                }
            });   
        }
    }
});