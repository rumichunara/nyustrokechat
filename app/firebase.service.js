angular
  .module('app')
  .factory('Firebase', FirebaseService);


// Services
FirebaseService.$inject = ['$rootScope', '$state', '$timeout'];

function FirebaseService($rootScope, $state, $timeout) {
  var instance = {
    
    // Internal stuff
    _onEveryFirebaseRequest: function () {
      if (!$rootScope.$$phase)
        $rootScope.$apply();
    },
    
    whenNewMessage: function (){},
    user_id: null,
    users: {},
    groups: {},
    max_members_per_group: 6,
    
    colors: ['blue', 'green', 'red', 'yellow', 'brown', 'pink', 'indigo',  'lightgreen', 'purple','amber', 'lightblue', 'deeporange', 'cyan','deeppurple', 'lime', 'teal', 'orange', 'bluegrey'],
    last_color_used: -1,
    
    
    // Initialization
    init: function () {
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
          instance._afterAuthStateChanged();
          return;
        }
          
        instance.user_id = user.uid;
        instance._afterAuthStateChanged();
        
        if (instance.user_id != null) {
          firebase.database().ref('/users/' + instance.user_id).update({ last_active: new Date().getTime() });          

          // Lets get the rest of the info of the user, then well load the messages (because we need to know the group he belongs to)
          instance.getUserData(instance.user_id, function () {
            // We already have this field but not in the users list, we have to wait until the entry exists
            instance.users[instance.user_id].email = user.email;
            // Let's get the user's group data
            instance.getGroupData(instance.users[instance.user_id].group_id, instance.loadMessages);
            
            // If its an admin
            if (instance.users[instance.user_id].admin)
            {
              instance.getAllUsers();
              instance.getAllGroups();
            }
          });
          
          instance._onEveryFirebaseRequest();
        }
      });
    },
    
    _afterAuthStateChanged: function () {
      if (instance.user_id == null)
        $state.go('authentication');
      else
        $state.go('home');
      $timeout(function () {
        componentHandler.upgradeAllRegistered();
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
      {
        if (typeof on_get == 'function')
          on_get();
        return;
      }
      
      // If that is not the case we'll search for it
      instance.users[user_id] = {};
      
      // Let's assign a color for the user, if there are no more colors available then we start again
      instance.last_color_used++;
      if (instance.last_color_used >= instance.colors.length)
        instance.last_color_used = 0;
      instance.users[user_id].color = instance.colors[instance.last_color_used];
      
      // Let's request all the data
      var r = firebase.database().ref('/users/' + user_id);
      r.on('value', function(s) {
        var v = s.val();
        
        // Precaution: user_id may not be set by default, so, if it is not set then we will
        instance.users[user_id].user_id = (v.user_id != undefined) ? v.user_id : '';
        if (instance.users[user_id].user_id == '')
          firebase.database().ref('/users/' + user_id).update({ user_id: user_id })
        
        instance.users[user_id].name = (v.name != undefined) ? v.name : '';
        instance.users[user_id].email = (v.email != undefined) ? v.email : '';
        instance.users[user_id].group_id = (v.group_id != undefined) ? v.group_id : '';
        instance.users[user_id].admin = (v.admin != undefined) ? v.admin : false;
        
        instance.users[user_id].joined = (v.joined != undefined) ? v.joined : '';
        if (instance.users[user_id].joined == '')
          firebase.database().ref('/users/' + user_id).update({ joined: new Date().getTime() });
        
        if (typeof on_get == 'function')
          on_get();
        
        // Let'g get the profile URL if it is needed
        instance.getUrlOfImage(((v.profile_picture != undefined) ? v.profile_picture : ''), function(r) { 
          instance.users[user_id].profile_picture = r;
        });
        
        r.off(); // I dont want to excecute this every time user data changes
        
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
      instance.whenNewMessage(d);
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
      var r = firebase.database().ref('/groups/' + group_id);
      r.on('value', function(s) {
        var v = s.val();
        // From its data let's get what interests us
        instance.groups[group_id].group_id = (v != null  && v.group_id != undefined) ? v.group_id : '';
        instance.groups[group_id].name = (v != null  && v.name != undefined) ? v.name : '';
        instance.groups[group_id].members = (v != null  && v.members != undefined) ? v.members : {};
        instance.groups[group_id].members_count = 0;
        
        angular.forEach(instance.groups[group_id].members, function (user_id, d) {
          instance.getUserData(user_id);
          instance.groups[group_id].members_count++;
        });
        
        if (typeof on_get == 'function')
          on_get();
        
        r.off();
        
        instance._onEveryFirebaseRequest();
      });
    },
    
    
    // Admin stuff
    getAllUsers: function () {
      var r = firebase.database().ref('/users/');
      r.on('child_added', function (s) {
        instance.getUserData(s.val().user_id);
        r.off();
        instance._onEveryFirebaseRequest();
      });
    },
    
    
    getAllGroups: function () {
      var r = firebase.database().ref('/groups/');
      r.on('child_added', function (s) {
        instance.getGroupData(s.val().group_id);
        r.off();
        instance._onEveryFirebaseRequest();
      });
    }
  };
  return instance;
}
