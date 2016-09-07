angular
  .module('nyuChat', [])
  .controller('MainController', mainController);

mainController.$inject = ['$rootScope', '$window', '$scope'];
function mainController($rootScope, $window, $scope) {
  
  // General stuff
  $scope.get_url_of_image = function (url, callback) {
    if (url.startsWith('gs://'))
      firebase.storage().refFromURL(url).getMetadata().then(function(metadata) {
        callback(metadata.downloadURLs[0]);
        $scope.$apply();
      });
  }
  
  // Authentication stuff
  $scope.authentication_reset = function () {
    $scope.authentication_full_name = $scope.authentication_email = $scope.authentication_password = $scope.authentication_confirm_password = '';
  }
  $scope.authentication_reset();
  $scope.authentication_error_reset = function () {
    $scope.authentication_error_email = $scope.authentication_error_password = $scope.authentication_error_confirm_password = '';
  }
  $scope.authentication_error_reset();
  
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
  
  $scope.authentication_reset_password = function () {
    firebase.auth().sendPasswordResetEmail($scope.authentication_email).then(function (r) {
      $scope.authentication_error_email = 'An email has been sent to this address with further instructions';
      $scope.authentication_in_progress = false;
      $scope.$apply();
    }, function(error) {
      $scope.authentication_error_email = error.message;
      $scope.authentication_in_progress = false;
      $scope.$apply();
    });
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
      // Lets get the rest of the info of the user
      $scope.messages_reference = firebase.database().ref('/users/' + firebase.auth().currentUser.uid).once('value').then(function(snapshot) {
        var v = snapshot.val();
        $scope.user.name = (v != null  && v.name != undefined) ? v.name : '';
        $scope.get_url_of_image(((v != null  && v.profile_picture != undefined) ? v.profile_picture : ''), function(r) { $scope.user.profile_picture = r });
      });
      
      // Lets reset the authentication screen
      $scope.authentication_reset();
      $scope.authentication_error_reset();
      $scope.authentication_state = 'signing_in';
      $scope.authentication_in_progress = false;
      $scope.load_messages();
      $scope.$apply();
    }
  });

  
  //Profile stuff
  $scope.my_profile_visible = false;
  
  $scope.show_my_profile = function (b) {
    $scope.my_profile_visible = b;
  };
  
  $scope.editing_profile = false;
  $scope.toggle_edit_profile = function () {
    $scope.editing_profile = !$scope.editing_profile;
  }
  
  $scope.edit_profile_confirm = function (e) {
      if (e.code == 'Enter') {
        $scope.editing_profile = false;
        firebase.database().ref('/users/' + firebase.auth().currentUser.uid).update({
            name: $scope.user.name
          });
      }
  }
  
  $scope.select_profile_picture = function () {
    document.getElementById('profile_picture_file').click();
  }
  
  $scope.upload_profile_picture = function (e) {
    var file = e.target.files[0];
    if (!file.type.match('image.*'))
      return;
    
    if ($scope.user != null) {
      var uploadTask = firebase.storage().ref(firebase.auth().currentUser.uid + '/' + Date.now() + '/' + file.name).put(file, {'contentType': file.type});
      
      uploadTask.on('state_changed', null, function(error) {
        console.error('There was an error uploading a file to Firebase Storage:', error);
      }, function() {
        var url = firebase.storage().ref(uploadTask.snapshot.metadata.fullPath).toString();
        firebase.database().ref('/users/' + firebase.auth().currentUser.uid).update({profile_picture: url});
        $scope.get_url_of_image(url, function(r) { $scope.user.profile_picture = r });
      });
    }
  }

  // Chat stuff
  $scope.sending_message = false;
  $scope.message = '';
  $scope.messages = [];
  $scope.messages_reference = null;

  $scope.add_message = function(data) {
    $scope.messages.push(data.val());
    $scope.$apply();
  }
  
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
