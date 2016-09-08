var date = require( '../node_modules/locutus/php/datetime/date' );

var fileSaver = require( './filesaver.min' );


angular
  .module('nyuChat', [])
  .controller('MainController', mainController)
  .factory('Firebase', FirebaseService)
  .filter('showTime', showTimeFilter);

mainController.$inject = ['$rootScope', '$window', '$scope', 'Firebase', '$timeout'];

function mainController($rootScope, $window, $scope, Firebase, $timeout) {
  
  // Our variables
  $scope.authentication_state = 'signing_in';
  $scope.terms_read = false;
  $scope.authentication_in_progress = false;
  
  $scope.my_profile_visible = false;
  $scope.editing_profile = false;
  
  $scope.sending_message = false;
  $scope.new_message = '';
  $scope.messages = [];
  $scope.last_message_loaded = -1;

  
  // Initialization
  $scope.Firebase = Firebase.init(function () {
    if (!$scope.$$phase)
      $scope.$apply();
  }, function (m) {
     $scope.messages.push(m);
     
     // Workaround for scrolling to the bottom on start but never again
     $timeout(function() {
       var t = new Date().getTime();
       if ($scope.last_message_loaded == -1 || t - $scope.last_message_loaded <  100)
       {
         $scope.last_message_loaded = t;
         jQuery('#messages_list').scrollTop(jQuery('#messages_list').prop("scrollHeight"));
       }
     }, 0);
  });
  
  // Authentication stuff
  $scope.authentication_reset = function () {
    $scope.authentication_full_name = $scope.authentication_email = $scope.authentication_password = $scope.authentication_confirm_password = '';
  }
  $scope.authentication_reset();
  $scope.authentication_error_reset = function () {
    $scope.authentication_error_email = $scope.authentication_error_password = $scope.authentication_error_confirm_password = '';
  }
  $scope.authentication_error_reset();
  
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
  
  $scope.authentication_reset_password = function () {
    Firebase.sendPasswordResetEmail($scope.authentication_email, function () {
      $scope.authentication_error_email = 'An email has been sent to this address with further instructions';
      $scope.authentication_in_progress = false;
    }, function(error) {
      $scope.authentication_error_email = error.message;
      $scope.authentication_in_progress = false;
    });
  }
  
  $scope.sign_out = Firebase.signOut;


  
  //Profile stuff
  $scope.show_my_profile = function (b) {
    $scope.my_profile_visible = b;
  };
  
  $scope.toggle_edit_profile = function () {
    $scope.editing_profile = !$scope.editing_profile;
  }
  
  $scope.edit_profile_confirm = function (e) {
    if (e.code == 'Enter') {
      $scope.editing_profile = false;
      Firebase.editUserProfileName(Firebase.users[Firebase.user_id].name);
    }
  }
  
  $scope.select_profile_picture = function () {
    document.getElementById('profile_picture_file').click();
  }
  
  $scope.upload_profile_picture = function (e) {
    var file = e.target.files[0];
    if (!file.type.match('image.*'))
      return;
    Firebase.saveProfilePicture(file);
  }
  
  $scope.get_profile_picture = function (u) {
     return (u == null || u.profile_picture == undefined || u.profile_picture == '') ? '/img/avatar.png' : u.profile_picture;
  }

  
  
  // Chat stuff
  
  $scope.send_message = function (m) {
    $scope.new_message = ''; // For not losing focus when pressing enter
    $scope.sending_message = true;
    Firebase.sendMessage(m, function () {
      $scope.sending_message = false;
      jQuery('#messages_list').scrollTop(jQuery('#messages_list').prop("scrollHeight"));
    });
  }
  
  $scope.message_keypressed = function (e) {
    if (e.code == 'Enter') {
      var m = $scope.new_message; // For not losing focus when pressing enter
      $scope.new_message = ''; // For not losing focus when pressing enter
      $scope.send_message(m);
      e.preventDefault(); // For not losing focus when pressing enter
    }
  }
  
  $scope.download_log = function () {
    var cl = '';
    angular.forEach($scope.messages, function (d, i) {
      var t = new Date(d.when);
      cl += '<tr>' + '<td>' + date('Y-m-d H:i:s', t) + '</td>' + '<td>' + Firebase.users[d.user_id].name + '</td>' + '<td>' + Firebase.users[d.user_id].message + '</td>' + '</tr>';
    });
    
    var c = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Log</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>' + cl + '</table></body></html>';
    
    fileSaver.saveAs(new Blob([c] , {type: "application/vnd.ms-excel;charset=UTF-8"}), 'log' );
  }
  
  // Admin stuff
  // $scope.create_grup = function () {
    // firebase.database().ref('/groups/').push({
      // name: "Group 1",
      // members: ['P89MVRvSTvQ5eGmeMGhWOYitmTd2', 'xCjTY3qt49exjsKT9db0VqPE9fU2']
    // });
  // };
  // $scope.create_grup();
}




// Services
FirebaseService.$inject = [];

function FirebaseService() {
  var instance = {
    
    // Internal stuff
    _onEveryFirebaseRequest: function () {},
    _whenNewMessage: function (){},
    
    user_id: null,
    users: {},
    groups: {},
    
    colors: ['blue', 'green', 'red', 'yellow', 'brown', 'pink', 'indigo',  'lightgreen', 'purple','amber', 'lightblue', 'deeporange', 'cyan','deeppurple', 'lime', 'teal', 'orange', 'bluegrey'],
    last_color_used: -1,
    
    
    // Initialization
    init: function (onEveryFirebaseRequest, whenNewMessage) {
      
      if (typeof onEveryFirebaseRequest == 'function')
        instance._onEveryFirebaseRequest = onEveryFirebaseRequest; // This exists because firebase requests do not run scope apply of Angular
      
      if (typeof whenNewMessage == 'function')
        instance._whenNewMessage = whenNewMessage;
      
      instance._onAuthStateChanged();
      
      return instance;
    },
    
    
    // Authentication stuff
    _onAuthStateChanged: function () {
      firebase.auth().onAuthStateChanged(function(user) {
        // If its a log out then reload the page
        if (instance.user_id != null && user == null)
        {
          location.reload();
          return;
        }
        
        if (user == null) {
          instance.user_id = null;
          return;
        }
                  
        instance.user_id = user.uid;
        
        if (instance.user_id != null) {
          // Lets get the rest of the info of the user, then well load the messages (because we need to know the group he belongs to)
          instance.getUserData(instance.user_id, function () {
            // We already have this field but not in the users list, we have to wait until the entry exists
            instance.users[instance.user_id].email = user.email;
            // Let's get the user's group data
            instance.getGroupData(instance.users[instance.user_id].group_id, instance.loadMessages);
          });
          
          instance._onEveryFirebaseRequest();
        }
      });
    },
    
    createUserWithEmailAndPassword: function (email, password, callback) {
        firebase.auth().createUserWithEmailAndPassword(email, password).catch(function (error) {
          if (typeof callback == 'function')
            callback(error);
          instance._onEveryFirebaseRequest();
        });
    },
    
    signInWithEmailAndPassword: function (email, password, callback) {
        firebase.auth().signInWithEmailAndPassword(email, password).catch(function (error) {
          if (typeof callback == 'function')
            callback(error);
          instance._onEveryFirebaseRequest();
        });
    },
    
    sendPasswordResetEmail: function (email, callback_success, callback_error) {
      firebase.auth().sendPasswordResetEmail(email).then(function () {
          if (typeof callback_success == 'function')
            callback_success();
          instance._onEveryFirebaseRequest();
        }, function (error) {
          if (typeof callback_error == 'function')
            callback_error(error);
          instance._onEveryFirebaseRequest();
        });
    },
    
    signOut: function () {
      firebase.auth().signOut();
    },
    
    
    
    // Profile stuff
    getUserData: function (user_id, on_get) {
      
      // If we already have the user data then we dont search for it
      if (instance.users[user_id] != undefined)
        return;
      
      // If that is not the case we'll search for it
      instance.users[user_id] = {};
      
      // Let's assign a color for the user, if there are no more colors available then we start again
      instance.last_color_used++;
      if (instance.last_color_used >= instance.colors.length)
        instance.last_color_used = 0;
      instance.users[user_id].color = instance.colors[instance.last_color_used];
      
      // Let's request all the data
      firebase.database().ref('/users/' + user_id).on('value', function(s) {
        var v = s.val();
        
        // Precaution: user_id may not be set by default, so, if it is not set then we will
        instance.users[user_id].user_id = (v.user_id != undefined) ? v.user_id : '';
        if (instance.users[user_id].user_id == '')
          firebase.database().ref('/users/' + user_id).update({ user_id: user_id })
        
        instance.users[user_id].name = (v.name != undefined) ? v.name : '';
        instance.users[user_id].group_id = (v.group_id != undefined) ? v.group_id : '';
        
        instance.users[user_id].joined = (v.joined != undefined) ? v.joined : '';
        if (instance.users[user_id].joined == '')
          firebase.database().ref('/users/' + user_id).update({ joined: new Date().getTime() });
        
        instance.users[user_id].last_active = new Date().getTime();
        firebase.database().ref('/users/' + user_id).update({ last_active: instance.users[user_id].last_active });
        
        if (typeof on_get == 'function')
          on_get();
        
        // Let'g get the profile URL if it is needed
        instance.getUrlOfImage(((v.profile_picture != undefined) ? v.profile_picture : ''), function(r) { 
          instance.users[user_id].profile_picture = r;
        });
        
        instance._onEveryFirebaseRequest();
      });
    },
    
    getUrlOfImage: function (url, callback) {
      if (url.startsWith('gs://'))
        firebase.storage().refFromURL(url).getMetadata().then(function(metadata) {
          callback(metadata.downloadURLs[0]);
          instance._onEveryFirebaseRequest();
        });
    },
    
    editUserProfileName: function (name) {
      firebase.database().ref('/users/' + instance.user_id).update({ name: name });
    },
    
    saveProfilePicture: function(file) {
      if (instance.user_id != null) {
        var uploadTask = firebase.storage().ref(instance.user_id + '/' + Date.now() + '/' + file.name).put(file, {'contentType': file.type});
        uploadTask.on('state_changed', null, function(error) {
          console.error('There was an error uploading a file to Firebase Storage:', error);
        }, function() {
          var url = firebase.storage().ref(uploadTask.snapshot.metadata.fullPath).toString();
          firebase.database().ref('/users/' + instance.user_id).update({profile_picture: url});
          instance.getUrlOfImage(url, function(r) { 
            instance.users[instance.user_id].profile_picture = r;
          });
        });
      }
    },
    
    
    // Message stuff
    loadMessages: function () {
      if (instance.users[instance.user_id].group_id != '')
      {
        var mr = firebase.database().ref('/messages/' + instance.users[instance.user_id].group_id);
        mr.off();
        mr.on('child_added', instance._addMessage);
        mr.on('child_changed', instance._addMessage);
      }
    },
    
    _addMessage: function (v) {
      var d = v.val();
      // Let´s get the extra data of the message
      instance.getUserData(d.user_id);
      instance._whenNewMessage(d);
      instance._onEveryFirebaseRequest();
      
      // When a message is loaded we save the "last active" timestamp
      instance.users[instance.user_id].last_active = new Date().getTime();
      firebase.database().ref('/users/' + instance.user_id).update({ last_active: instance.users[instance.user_id].last_active });
    },
    
    sendMessage: function (message, callback_sent) {
      if (message != '' && instance.user_id != null)
        firebase.database().ref('/messages/' + instance.users[instance.user_id].group_id).push({
          user_id: instance.user_id,
          text: message,
          when: new Date().getTime(),
        }).then(function() {
          callback_sent();
          instance._onEveryFirebaseRequest();
        }).catch(function(error) {
          console.error('Error writing new message to Firebase Database', error);
          callback_sent();
          instance._onEveryFirebaseRequest();
        });
    },
    
    
    // Groups stuff
    getGroupData: function (group_id, on_get) {
      
      if (instance.groups[group_id] != undefined)
        return;
      
      instance.groups[group_id] = {};
            
      // Let's request all the data
      firebase.database().ref('/groups/' + group_id).on('value', function(s) {
        var v = s.val();
        // From its data let's get what interests us
        instance.groups[group_id].group_id = (v != null  && v.group_id != undefined) ? v.group_id : '';
        instance.groups[group_id].name = (v != null  && v.name != undefined) ? v.name : '';
        instance.groups[group_id].members = (v != null  && v.members != undefined) ? v.members : {};
        
        angular.forEach(instance.groups[group_id].members, function (user_id, d) {
          instance.getUserData(user_id);
        });
        
        if (typeof on_get == 'function')
          on_get();
        
        instance._onEveryFirebaseRequest();
      });
    },
  };
  return instance;
}


// Filters

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
