angular
  .module('nyuChat', [])
  .controller('MainController', mainController);

mainController.$inject = ['$rootScope', '$window', '$scope'];
function mainController($rootScope, $window, $scope) {
  
  // Authentication stuff
  $scope.authentication_reset = function () {
    $scope.authentication_full_name = $scope.authentication_email = $scope.authentication_password = $scope.authentication_confirm_password = '';
  }
  $scope.authentication_reset();
  $scope.authentication_error_reset = function () {
    $scope.authentication_error_email = $scope.authentication_error_password = $scope.authentication_error_confirm_password = '';
  }
  $scope.authentication_error_reset();
  
  // Our variables
  $scope.authentication_state = 'signing_in';
  $scope.user = null;
  $scope.terms_read = false;
  $scope.authentication_in_progress = false;
  
  
  $scope.authentication_state_change = function (s) {
    $scope.authentication_reset();
    $scope.authentication_error_reset();
    $scope.authentication_state = s;
  }
  
  $scope.authentication_confirm = function () {
    $scope.authentication_in_progress = true;
    if ($scope.authentication_state == 'registering') {
      $scope.authentication_error_reset();
      if ($scope.authentication_password != $scope.authentication_confirm_password) {
        $scope.authentication_error_confirm_password = 'The password and its confirmation do not match.';
        $scope.authentication_in_progress = false;
      }
      else {
        firebase.auth().createUserWithEmailAndPassword($scope.authentication_email, $scope.authentication_password).catch(function(error) {
          if (error.code == 'auth/weak-password') {
            $scope.authentication_error_password = error.message;
          }
          else {
            $scope.authentication_error_email = error.message;
          }
          $scope.authentication_in_progress = false;
          $scope.$apply();
        });
      }
    }
    else if ($scope.authentication_state == 'signing_in') {
      firebase.auth().signInWithEmailAndPassword($scope.authentication_email, $scope.authentication_password).catch(function(error) {
          if (error.code == 'auth/wrong-password') {
            $scope.authentication_error_password = error.message;
          }
          else {
            $scope.authentication_error_email = error.message;
          }
          $scope.authentication_in_progress = false;
          $scope.$apply();
      });
    }
  }
  
  $scope.sign_out = function () {
    firebase.auth().signOut();
  }

  firebase.auth().onAuthStateChanged(function(user) {
    // If its a log out then reload the page
    if ($scope.user != null && user == null)
    {
      location.reload();
      return;
    }
    
    $scope.user = user;
    
    if ($scope.user != null) {
      $scope.authentication_reset();
      $scope.authentication_error_reset();
      $scope.authentication_state = 'signing_in';
      $scope.authentication_in_progress = false;
      $scope.load_messages();
      $scope.$apply();
    }
  });


  // Chat stuff
  $scope.sending_message = false;
  $scope.message = '';
  $scope.messages = [];
  $scope.messages_reference = null;

  $scope.add_message = function(data) {
      $scope.messages.push(data.val());
      $scope.$apply();
    };
  
  $scope.load_messages = function () {
    $scope.messages_reference = firebase.database().ref('messages');
    $scope.messages_reference.off();
    $scope.messages_reference.on('child_added', $scope.add_message);
    $scope.messages_reference.on('child_changed', $scope.add_message);
  }
  
  $scope.send_message = function () {
    $scope.sending_message = true;
    if ($scope.messages_reference != null && $scope.message != '' && ($scope.user != null)) {
      $scope.messages_reference.push({
        email: $scope.user.email,
        text: $scope.message,
        when: new Date().getTime(),
      }).then(function() {
        $scope.message = '';
        $scope.sending_message = false;
        $scope.$apply();
      }).catch(function(error) {
        console.error('Error writing new message to Firebase Database', error);
        $scope.sending_message = false;
        $scope.$apply();
      });
    }
    else
      $scope.sending_message = false;
  }
  
  $scope.message_keypressed = function (e) {
    if (e.code == 'Enter') {
      $scope.send_message();
    }
  }
}
