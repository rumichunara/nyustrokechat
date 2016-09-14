angular
  .module( 'app' )
  .factory( 'Firebase', FirebaseService );


// Services
FirebaseService.$inject = ['$rootScope', '$state', '$timeout'];

function FirebaseService( $rootScope, $state, $timeout ) {
  var instance = {
    
    user_id: null,
    users: {},
    groups: {},
    messages: {},
    
    max_members_per_group: 6,
    last_message_loaded: -1,
    
    colors: ['blue', 'green', 'red', 'yellow', 'brown', 
             'pink', 'indigo', 'lightgreen', 'purple',
             'amber', 'lightblue', 'deeporange', 'cyan',
             'deeppurple', 'lime', 'teal', 'orange', 'bluegrey'],
    last_color_used: -1,
    
    
    // Initialization
    init: function init() {
      instance._onAuthStateChanged();
      
      return instance;
    },
    
    
    // Authentication stuff
    _onAuthStateChanged: function onAuthStateChanged() {
      firebase.auth().onAuthStateChanged( function onAuthStateChanged ( user ) {
        $timeout( function timeout() {
          // If its a log out then reload the page
          if ( instance.user_id != null && user === null ) {
            location.reload();
            return;
          }
          
          if ( user === null ) {
            instance.user_id = null;
            instance._afterAuthStateChanged();
            return;
          }
            
          instance.user_id = user.uid;
          instance._afterAuthStateChanged();
          
          if ( instance.user_id != null ) {
            // When we log in we register the listener for our data only once.
            var timesExecuted = 0;
            instance.getUserData( instance.user_id, function callback () {
              // We will only run once the registration of the 
              // listeners of the current group data and admin data
              if ( timesExecuted === 0 ) {
                timesExecuted += 1;
                // We already have this field but not in the users list
                // we have to wait until the entry exists
                instance.users[instance.user_id].email = user.email;
                // Let's get the user's group data
                instance.getGroupData( instance.users[instance.user_id].group_id, 
                  instance.loadMessages );
                
                // If its an admin
                if ( instance.users[instance.user_id].admin ) {
                  instance.getAllUsers();
                  instance.getAllGroups();
                }
              }
            }, true );
          }
        });
      });
    },
    
    _afterAuthStateChanged: function afterAuthStateChanged() {
      if ( instance.user_id === null ) {
        $state.go( 'authentication' );
      } else {
        $state.go( 'home' );
      }
      instance.redrawMdLite();
    },
    
    createUserWithEmailAndPassword: function create( email, password, callback ) {
      firebase.auth()
        .createUserWithEmailAndPassword( email, password )
        .catch( function onerror( error ) {
          $timeout( function timeout() {
            if ( angular.isFunction( callback ) ) {
              callback( error );
            }
          });
        });
    },
    
    signInWithEmailAndPassword: function signInWithEmailAndPassword( email, password, callback ) {
      firebase.auth().signInWithEmailAndPassword( email, password ).catch( function onerror( error ) {
        $timeout( function timeout() {
          if ( angular.isFunction( callback ) ) {
            callback( error );
          }
        });
      });
    },
    
    sendPasswordResetEmail: function sendPasswordResetEmail( email, callbackSuccess, callbackError ) {
      firebase.auth().sendPasswordResetEmail( email ).then( function onThen() {
        $timeout( function timeout() {
          if ( angular.isFunction( callbackSuccess ) ) {
            callbackSuccess();
          }
        });
      }, function onError( error ) {
        $timeout( function timeout() {
          if ( angular.isFunction( callbackError ) ) {
            callbackError( error );
          }
        });
      });
    },
    
    signOut: function signOut() {
      firebase.auth().signOut();
    },
    
    
    
    // Profile stuff
    _checkUpdateUserData: function _checkUpdateUserData ( oldData, userId, userColor, newValue ) {
      if ( angular.isDefined( oldData ) ) {
        // If it is an update then we have a couple of values we need to keep
        instance.users[userId].color = oldData.color;
        
        // Maybe we need to calculate the image url again
        if ( oldData.profile_picture_url !== '' 
            && oldData.profile_picture !== instance.users[userId].profile_picture ) {
          instance.getUrlOfImage( oldData.profile_picture, function onGetUrlOfImage( r ) { 
            instance.users[userId].profile_picture_url = r;
          });
        } else {
          instance.users[userId].profile_picture_url = oldData.profile_picture_url;
        }
        
        // If I am changing then maybe I am changing of selected group
        if ( userId === instance.user_id && oldData.group_id !== newValue.group_id ) {
          // We dont need anymore the old group messages
          instance.messages[oldData.group_id] = []; 
          // We will have to listen for messages again
          instance.loadMessages();
        }
      } else {
        // Its the first time we are loading its data
        instance.users[userId].color = userColor;
        
        // Lets load the correct url of its profile picture
        if ( angular.isDefined( instance.users[userId].profile_picture ) 
          && instance.users[userId].profile_picture !== '' ) {
          instance.getUrlOfImage( instance.users[userId].profile_picture, 
          function onGetUrlOfImage( r ) { 
            instance.users[userId].profile_picture_url = r;
          });
        } else {
          instance.users[userId].profile_picture_url = '';
        }
      }
    },
    
    
    getUserData: function getUserData( userId, onEveryValueChange ) {
      
      // If we already got user data and the listener then we dont do it again
      if ( angular.isDefined( instance.users[userId]) ) {
        return;
      }
      
      // Let's assign a color for the user, if there are no more colors available then we start again
      instance.last_color_used += 1;
      if ( instance.last_color_used >= instance.colors.length ) {
        instance.last_color_used = 0;
      }
      var userColor = instance.colors[instance.last_color_used];
      
      // Let's register the listener for the user data
      var r = firebase.database().ref( `/users/${userId}` );
      r.on( 'value', function valueAssigned( s ) {
        $timeout( function timeout() {
          var v = s.val();
          var oldData = instance.users[userId];
          
          // Maybe our user is being deleted while we are logged in!
          if ( userId === instance.user_id && v === null ) {
            instance.signOut();
            return;
          }
          
          instance.users[userId] = v;
          
          // Lets make us sure of this
          if ( angular.isUndefined( instance.users[userId].group_id ) ) {
            instance.users[userId].group_id = null;
          }
          
          instance._checkUpdateUserData( oldData, userId, userColor, v );

          
          // Lets save the moment he joins
          if ( instance.users[userId].joined === '' ) {
            firebase.database().ref( `/users/${userId}` ).update({ joined: new Date().getTime() });
          }
          
          if ( angular.isFunction( onEveryValueChange ) ) {
            onEveryValueChange();
          }

          instance.redrawMdLite();
          // We are not doing "r.off();" because we want to update every time the user data changes
        });
      });
    },
    
    getUrlOfImage: function getUrlOfImage( url, callback ) {
      if ( url.startsWith( 'gs://' ) ) {
        firebase.storage().refFromURL( url ).getMetadata().then( function onGetMetadata( metadata ) {
          $timeout( function timeout() {
            callback( metadata.downloadURLs[0]);
          });
        });
      }
    },
    
    editUserProfileName: function editUserProfileName( name ) {
      firebase.database().ref( `/users/${instance.user_id}` ).update({ name: name });
    },
    
    saveProfilePicture: function saveProfilePicture( file ) {
      if ( instance.user_id != null ) {
        var uploadTask = firebase.storage()
          .ref( `${instance.user_id}/${Date.now()}/${file.name}` )
          .put( file, {'contentType': file.type});
        uploadTask.on( 'state_changed', null, function stateChanged() {
        }, function loadProfilePicture() {
          var url = firebase.storage().ref( uploadTask.snapshot.metadata.fullPath ).toString();
          firebase.database().ref( `/users/${instance.user_id}` ).update({profile_picture: url});
          instance.getUrlOfImage( url, function onGetUrlOfImage( r ) { 
            instance.users[instance.user_id].profile_picture_url = r;
          });
        });
      }
    },
    
    _updateLastActive: function _updateLastActive() {
      // When a message is loaded we save the "last active" timestamp
      instance.users[instance.user_id].last_active = new Date().getTime();
      firebase.database()
        .ref( `/users/${instance.user_id}` )
        .update({ last_active: instance.users[instance.user_id].last_active });
    },
    

    // Message stuff
    loadMessages: function loadMessages() {
      instance.last_message_loaded = -1; // Signal for forcing scrolling down
      instance._onMessageLoaded();
      if ( instance.users[instance.user_id].group_id !== null ) {
        instance.messages[instance.users[instance.user_id].group_id] = [];
        var mr = firebase.database().ref( `/messages/${instance.users[instance.user_id].group_id}` );
        mr.off();
        mr.on( 'child_added', instance._addMessage );
      }
    },
    
    _onMessageLoaded: function _onMessageLoaded () { 
      // Dummy, to be set
    },
    
    addOnMessageLoaded: function addOnMessageLoaded ( a ) {
      if ( angular.isFunction( a ) ) {
        instance._onMessageLoaded = a;
      }
    },
    
    setLastMessageLoaded: function setLastMessageLoaded( t ) {
      instance.last_message_loaded = t;
    },
    
    _addMessage: function _addMessage( v ) {
      $timeout( function timeout() {
        var d = v.val();
        instance.last_message_loaded = new Date().getTime();
        instance._onMessageLoaded();
        instance.getUserData( d.user_id );
        if ( angular.isUndefined( instance.messages[instance.users[instance.user_id].group_id]) ) {
          instance.messages[instance.users[instance.user_id].group_id] = [];
        }
        instance.messages[instance.users[instance.user_id].group_id].push( d );
      });
    },
    
    sendMessage: function sendMessage( message, callbackSent ) {
      if ( message !== '' && instance.user_id !== null 
        && instance.users[instance.user_id].group_id !== null ) {
        firebase.database().ref( `/messages/${instance.users[instance.user_id].group_id}` ).push({
          user_id: instance.user_id,
          text: message,
          when: new Date().getTime(),
        }).then( function onMessageGet() {
          $timeout( function timeout() {
            callbackSent();
            instance._updateLastActive();
          });
        }).catch( function onMessageError() {
          $timeout( function timeout() {
            callbackSent();
          });
        });
      }
    },
    
    
    // User stuff
    
    getAllUsers: function getAllUsers() {
      var r = firebase.database().ref( '/users/' );
      r.on( 'child_added', function childAdded( s ) {
        $timeout( function timeout() {
          instance.getUserData( s.val().user_id );
          r.off();
        });
      });
    },
    
    removeUser: function removeUser ( userId ) {
      instance._removeUserFromAnyOtherGroup( userId );
      firebase.database().ref( `/users/${userId}` ).remove();
      delete instance.users[userId];
      // We wont remove the messages, we still want them
    },
    
    addUser: function addUser ( groupId, email ) {
      var userId = firebase.database().ref( '/users/' ).push().key;
      var updates = {};
      updates[`/users/${userId}`] = {
        user_id: userId,
        group_id: groupId,
        email: email,
      };
      return firebase.database().ref().update( updates );
      
      // TODO: We need to send an email inviting the person!
    },
    
    
    // Groups stuff
    getGroupData: function getGroupData( groupId, onGet ) {
      
      if ( groupId === null || angular.isDefined( instance.groups[groupId]) ) {
        return;
      }
      
      instance.groups[groupId] = {};
            
      // Let's request all the data
      var r = firebase.database().ref( `/groups/${groupId}` );
      r.on( 'value', function onValueUpdated( s ) {
        // This function gets called every time de value is added, changes or is deleted.
        $timeout( function timeout() {
          var v = s.val();
          
          if ( v === null ) { // deleted
            delete instance.groups[groupId];
            if ( angular.isDefined( instance.messages[groupId]) ) {
              delete instance.messages[groupId];
            }
            instance.redrawMdLite();
            return;
          }
          
          // From its data let's get what interests us
          instance.groups[groupId] = v;
          instance.groups[groupId].members_count = 0;
          
          angular.forEach( instance.groups[groupId].members, function forEachGroup( userId ) {
            instance.getUserData( userId );
            instance.groups[groupId].members_count += 1;
          });
          
          if ( angular.isFunction( onGet ) ) {
            onGet();
          }
          
          instance.redrawMdLite();
          // We are not doing "r.off();" because we want to update every time a group changed
        });
      });
    },
    
    addGroup: function addGroup ( name ) {
      var groupId = firebase.database().ref( '/groups/' ).push().key;      
      var updates = {};
      updates[`/groups/${groupId}`] = {
        group_id: groupId,
        members: [],
        name: name,
      };
      return firebase.database().ref().update( updates );
    },
    
    editGroupName( groupId, inputValue ) {
      firebase.database().ref( `/groups/${groupId}` ).update({ name: inputValue });
    },
    
    removeGroupLocally: function removeGroupLocally ( groupId ) {
      delete instance.groups[groupId];
    },
    
    selectGroup: function selectGroup ( groupId ) {
      firebase.database().ref( `/users/${instance.user_id}` ).update({ group_id: groupId });
    },
    
    deleteGroup: function deleteGroup ( groupId ) {
      // Delete the group and its messages
      // Do not assign the admin to any group
      // Do not assign a group to the members
      angular.forEach( instance.groups[groupId].members, function forEach ( userId ) {
        firebase.database().ref( `/users/${userId}` ).update({ group_id: null });
      });
      firebase.database().ref( `/users/${instance.user_id}` ).update({ group_id: null });
      firebase.database().ref( `/groups/${groupId}` ).remove();
      firebase.database().ref( `/messages/${groupId}` ).remove();
    },
    
    getAllGroups: function getAllGroups() {
      var r = firebase.database().ref( '/groups/' );
      r.on( 'child_added', function childAdded( s ) {
        $timeout( function timeout() {
          instance.getGroupData( s.val().group_id );
          // We are not doing "r.off();" because we want to update every time a group is added or deleted
        });
      });
      r.on( 'child_removed', function childAdded( s ) {
        $timeout( function timeout() {
          instance.removeGroupLocally( s.val().group_id );
          // We are not doing "r.off();" because we want to update every time a group is added or deleted
        });
      });
    },
    
    _removeUserFromAnyOtherGroup: function _removeUserFromAnyOtherGroup ( userId ) {
      angular.forEach( instance.groups, function forEach ( group, groupId ) {
        var newMembers = [];
        var foundInIt = false;
        if ( angular.isUndefined( group.members ) ) {
          return;
        }
        angular.forEach( group.members, function forEach2 ( iUserId ) {
          if ( iUserId === userId ) {
            foundInIt = true;
          } else {
            newMembers.push( iUserId );
          }
        });
        if ( foundInIt ) {
          firebase.database().ref( `/groups/${groupId}/members` ).set( newMembers );
        }
      });      
    },
    
    addUserToGroup: function addUserToGroup ( userId, groupId ) {
      if ( groupId === null ) {
        return;
      }
      instance._removeUserFromAnyOtherGroup( userId );
      firebase.database().ref( `/users/${userId}` ).update({ group_id: groupId });
      firebase.database().ref( `/groups/${groupId}/members` ).push( userId );
    },
    
    removeUserFromGroup: function removeUserFromGroup ( userId ) {
      instance._removeUserFromAnyOtherGroup( userId );
      firebase.database().ref( `/users/${userId}` ).update({ group_id: null });
    },
    
    // UI Stuff
    redrawMdLite: function redrawMdLite() {
      $timeout( componentHandler.upgradeAllRegistered ); // Let's redraw all mdlite components
    },
  };
  return instance;
}
