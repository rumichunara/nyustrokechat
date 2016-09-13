angular
  .module('app')
  .controller('AuthenticationController', authenticationController);
  
authenticationController.$inject = ['$rootScope', '$window', '$scope', 'Firebase', '$timeout'];


function authenticationController($rootScope, $window, $scope, Firebase, $timeout) {
  // Our variables
  $scope.authentication_state = 'signing_in';
  $scope.terms_read = false;
  $scope.authentication_in_progress = false;
  
  // Initialization
  $scope.Firebase = Firebase.init();

  // Authentication stuff
  $scope.authenticationReset = function () {
    $scope.authentication_full_name = $scope.authentication_email = $scope.authentication_password = $scope.authentication_confirm_password = '';
  }
  $scope.authenticationReset();
  $scope.authenticationErrorReset = function () {
    $scope.authentication_error_email = $scope.authentication_error_password = $scope.authentication_error_confirm_password = '';
  }
  $scope.authenticationErrorReset();
  
  $scope.authenticationStateChange = function (s) {
    $scope.authenticationReset();
    $scope.authenticationErrorReset();
    $scope.authentication_state = s;
  }
  
  $scope.authenticationConfirm = function () {
    $scope.authentication_in_progress = true;
    if ($scope.authentication_state == 'registering') {
      $scope.authenticationErrorReset();
      if ($scope.authentication_password != $scope.authentication_confirm_password) {
        $scope.authentication_error_confirm_password = 'The password and its confirmation do not match.';
        $scope.authentication_in_progress = false;
      }
      else {
        Firebase.createUserWithEmailAndPassword($scope.authentication_email, $scope.authentication_password, function(error) {
          if (error.code == 'auth/weak-password')
            $scope.authentication_error_password = error.message;
          else
            $scope.authentication_error_email = error.message;
          $scope.authentication_in_progress = false;
        });
      }
    }
    else if ($scope.authentication_state == 'signing_in') {
      Firebase.signInWithEmailAndPassword($scope.authentication_email, $scope.authentication_password, function(error) {
        if (error.code == 'auth/wrong-password')
          $scope.authentication_error_password = error.message;
        else
          $scope.authentication_error_email = error.message;
        $scope.authentication_in_progress = false;
      });
    }
  }
  
  $scope.authenticationResetPassword = function () {
    Firebase.sendPasswordResetEmail($scope.authentication_email, function () {
      $scope.authentication_error_email = 'An email has been sent to this address with further instructions';
      $scope.authentication_in_progress = false;
    }, function(error) {
      $scope.authentication_error_email = error.message;
      $scope.authentication_in_progress = false;
    });
  }
}

