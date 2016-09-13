angular
  .module('app')
  .controller('AuthenticationController', authenticationController);
  
authenticationController.$inject = ['$rootScope', '$window', '$scope', 'Firebase', '$timeout'];


function authenticationController($rootScope, $window, $scope, Firebase, $timeout) {
  // Our variables
  $scope.state = 'signing_in';
  $scope.terms_read = false;
  $scope.in_progress = false;
  
  // Initialization
  $scope.Firebase = Firebase.init();

  // Authentication stuff
  $scope.reset = function () {
    $scope.full_name = $scope.email = $scope.password = $scope.confirm_password = '';
  }
  $scope.reset();
  $scope.errorReset = function () {
    $scope.error_email = $scope.error_password = $scope.error_confirm_password = '';
  }
  $scope.errorReset();
  
  $scope.stateChange = function (s) {
    $scope.reset();
    $scope.errorReset();
    $scope.state = s;
  }
  
  $scope.confirm = function () {
    $scope.in_progress = true;
    if ($scope.state == 'registering') {
      $scope.errorReset();
      if ($scope.password != $scope.confirm_password) {
        $scope.error_confirm_password = 'The password and its confirmation do not match.';
        $scope.in_progress = false;
      }
      else {
        Firebase.createUserWithEmailAndPassword($scope.email, $scope.password, function(error) {
          if (error.code == 'auth/weak-password')
            $scope.error_password = error.message;
          else
            $scope.error_email = error.message;
          $scope.in_progress = false;
        });
      }
    }
    else if ($scope.state == 'signing_in') {
      Firebase.signInWithEmailAndPassword($scope.email, $scope.password, function(error) {
        if (error.code == 'auth/wrong-password')
          $scope.error_password = error.message;
        else
          $scope.error_email = error.message;
        $scope.in_progress = false;
      });
    }
  }
  
  $scope.resetPassword = function () {
    Firebase.sendPasswordResetEmail($scope.email, function () {
      $scope.error_email = 'An email has been sent to this address with further instructions';
      $scope.in_progress = false;
    }, function(error) {
      $scope.error_email = error.message;
      $scope.in_progress = false;
    });
  }
}

