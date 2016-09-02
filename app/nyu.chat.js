angular
  .module('nyuChat', [])
  .controller('MainController', mainController);

mainController.$inject = ['$rootScope', '$window', '$scope'];
function mainController($rootScope, $window, $scope) {
  
  // Authentication functions
  $scope.authentication_reset = function ()
  {
    $scope.authentication_full_name = $scope.authentication_email = $scope.authentication_password = $scope.authentication_confirm_password = '';
  }
  $scope.authentication_reset();
  $scope.authentication_error_reset = function ()
  {
    $scope.authentication_error_email = $scope.authentication_error_password = $scope.authentication_error_confirm_password = '';
  }
  $scope.authentication_error_reset();
  
  // Our variables
  $scope.authentication_state = 'signing_in';
  
  $scope.is_logged_in = false;
  $scope.terms_read = false;
  $scope.authentication_in_progress = false;
  
  
  $scope.authentication_state_change = function (s)
  {
    $scope.authentication_reset();
    $scope.authentication_error_reset();
    $scope.authentication_state = s;
  }
  
  $scope.authentication_confirm = function ()
  {
    $scope.authentication_in_progress = true;
    if ($scope.authentication_state == 'registering')
    {
      $scope.authentication_error_reset();
      if ($scope.authentication_password != $scope.authentication_confirm_password)
      {
        $scope.authentication_error_confirm_password = 'The password and its confirmation do not match.';
        $scope.authentication_in_progress = false;
      }
      else
      {
        firebase.auth().createUserWithEmailAndPassword($scope.authentication_email, $scope.authentication_password).catch(function(error) {
          if (error.code == 'auth/weak-password')
          {
            $scope.authentication_error_password = error.message;
          }
          else
          {
            $scope.authentication_error_email = error.message;
          }
          $scope.authentication_in_progress = false;
          $scope.$apply();
        });
      }
    }
    else if ($scope.authentication_state == 'signing_in')
    {
      firebase.auth().signInWithEmailAndPassword($scope.authentication_email, $scope.authentication_password).catch(function(error) {
          if (error.code == 'auth/wrong-password')
          {
            $scope.authentication_error_password = error.message;
          }
          else
          {
            $scope.authentication_error_email = error.message;
          }
          $scope.authentication_in_progress = false;
          $scope.$apply();
      });
    }
  }
  
  $scope.sign_out = function ()
  {
    firebase.auth().signOut();
  }

  firebase.auth().onAuthStateChanged(function(user) {
    // If its a log out then reload the page
    if ($scope.is_logged_in && user == null)
      location.reload();
    
    $scope.is_logged_in = (user != null);
    if ($scope.is_logged_in)
    {
      $scope.authentication_reset();
      $scope.authentication_error_reset();
      $scope.authentication_state = 'signing_in';
      $scope.authentication_in_progress = false;
      $scope.$apply();
    }
      
  });

}
