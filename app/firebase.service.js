/*eslint max-nested-callbacks: 1*/
/*eslint angular/document-service: 0*/


angular
  .module( 'app' )
  .factory( 'Firebase', FirebaseService );


// Services
FirebaseService.$inject = ['$rootScope', '$state', '$timeout', '$window'];

function FirebaseService( $rootScope, $state, $timeout, $window ) {
  var instance = {
    
    user_id: null,
    users: {},
    groups: {},
    groups_array: [],
    messages: {},
    
    max_members_per_group: 6,
    last_message_loaded: -1,
    possible_full_name: '',
    user_loaded_times: 0,
    user_fully_loaded: false,
    
    messages_to_load: 100,
    messages_to_load_step: 100,
    
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
    setPossibleFullName: function setPossibleFullName ( n ) {
      instance.possible_full_name = n;
    },
    
    
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
          
          if ( instance.user_id != null ) {
            // When we sign up we register the listener for our data only once.
            instance.user_loaded_times = 0;
            instance.getUserData( instance.user_id, function callback ( userVal ) {              
              // We will only run once the registration of the 
              // listeners of the current group data and admin data
              if ( instance.user_loaded_times === 0 ) {
                instance.user_loaded_times += 1;
                
                // First, lets check he really had an entry in 'users', if not, then he must have one in 'invited', if not, out!
                if ( userVal === null ) {
                  var possible = $window.btoa( user.email );
                  var r = firebase.database().ref( `/invited/${possible}` );
                  r.on( 'value', function valueAssigned( s ) {
                    $timeout( function timeout() {
                      var v = s.val();
                      r.off(); // We dont want more of this thing
                      
                      if ( v === null ) {
                        firebase.auth().currentUser.delete();
                        swal( 'Not invited', 'You have not been invited.', 'error' );
                        return;
                      } else {
                        // Welcome! Create the entry in users
                        firebase.database().ref( `/users/${instance.user_id}` ).set({
                          user_id: instance.user_id,
                          name: instance.possible_full_name,
                          email: user.email,
                          group_id: v.group_id,
                          joined: new Date().getTime(),
                        });
                        instance.addUserToGroup( instance.user_id, v.group_id );
                        // Lets on purpose load its group data, because its not loaded any other way
                        instance.getGroupData( v.group_id, instance.loadMessagesTheFirstTime );
                      }

                    });
                  });
                } else {
                  // He already exists, he is entering, lets check he wanted to stay logged in
                  var isCookieLoggedIn = false;
                  var cookies = document.cookie.split( ';' );
                  for ( var i = 0; i < cookies.length; i++ ) {
                    if ( cookies[i].trim() === 'logged=1' ) {
                      isCookieLoggedIn = true;
                    }
                  }
                      
                  if ( ( angular.isUndefined( userVal.stay ) || !userVal.stay ) && !isCookieLoggedIn ) {
                    // If there is no specific instruction to stay in and there is no session cookie then we must log him out
                    firebase.auth().signOut();
                    document.cookie = '';
                    return;
                  }
                  
                  // Let's get the user's group data
                  instance.getGroupData( instance.users[instance.user_id].group_id, 
                    instance.loadMessagesTheFirstTime );
                  
                  // If its an admin
                  if ( instance.users[instance.user_id].admin ) {
                    instance.getAllUsers();
                    instance.getAllGroups();
                  }
                }
                
                instance.user_fully_loaded = true;
              }
            }, true );
          }
          
          instance._afterAuthStateChanged();
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
    
    signInWithEmailAndPassword: function signInWithEmailAndPassword( email, password, keepMeSignedIn, callback ) {
      firebase.auth().signInWithEmailAndPassword( email, password )
        .then( function onresolved( user ) {
          $timeout( function timeout() {
            if ( keepMeSignedIn === 1 ) {
              // If the user wants to keep signed in then lets save this in the cookie for being saved in the user later
              firebase.database().ref( `/users/${user.uid}` ).update({ stay: true });
            } else {
              firebase.database().ref( `/users/${user.uid}` ).update({ stay: false });
            }
            // Let's create the cookie for not being logged out
            document.cookie = 'logged=1; path=/';
          });
        }, function onerror( error ) {
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
    
    getToken: function getToken( callback ) {
      firebase.auth().currentUser.getToken( true ).then( function getIdToken ( idToken ) {
        if ( angular.isFunction( callback ) ) {
          callback( idToken );
        }
      });
    },
    
    
    // Profile stuff
    _checkUpdateUserData: function _checkUpdateUserData ( oldData, userId, userColor, newValue ) {
      if ( angular.isDefined( oldData ) ) {
        // If it is an update then we have a couple of values we need to keep
        instance.users[userId].color = oldData.color;
        
        // Maybe we need to calculate the image url again
        if ( oldData.profile_picture_url !== '' 
            && oldData.profile_picture !== instance.users[userId].profile_picture ) {
          instance.getUrlOfImage( instance.users[userId].profile_picture, function onGetUrlOfImage( r ) { 
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
          instance.loadMessagesTheFirstTime();
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
        
        if ( angular.isFunction( onEveryValueChange ) ) {
          onEveryValueChange( instance.users[userId]);
        }
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
          
          // Maybe our user is being deleted while we are logged in or entering after registering
          if ( userId === instance.user_id && v === null && angular.isFunction( onEveryValueChange ) ) {
            onEveryValueChange( v );
            return;
          }
          
          // Maybe im an admin and a user is being deleted
          if ( userId !== instance.user_id && v === null ) {
            delete instance.users[userId];
            return;
          }
          
          instance.users[userId] = v;
          
          // Lets make us sure of this
          if ( angular.isUndefined( instance.users[userId].group_id ) ) {
            instance.users[userId].group_id = null;
          }
          
          instance._checkUpdateUserData( oldData, userId, userColor, v );

          
          if ( angular.isFunction( onEveryValueChange ) ) {
            onEveryValueChange( v );
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
          $timeout( function timeout() {
            var url = firebase.storage().ref( uploadTask.snapshot.metadata.fullPath ).toString();
            firebase.database().ref( `/users/${instance.user_id}` ).update({profile_picture: url});
            instance.getUrlOfImage( url, function onGetUrlOfImage( r ) {
              instance.users[instance.user_id].profile_picture_url = r;
            });
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
    loadMessagesTheFirstTime: function loadMessagesTheFirstTime() {
      if ( instance.users[instance.user_id].group_id !== null ) {
        instance.messages[instance.users[instance.user_id].group_id] = [];
        var mr = firebase.database().ref( `/messages/${instance.users[instance.user_id].group_id}` );
        mr.off();
        mr.limitToLast( instance.messages_to_load ).on( 'child_added', instance._addMessage( instance._onMessagesFirstLoaded ) );
      }
    },
    
    _onMessagesFirstLoaded: function _onMessagesFirstLoaded () { 
      // Dummy, to be set
    },
    
    addOnMessagesFirstLoaded: function addOnMessagesFirstLoaded ( a ) {
      if ( angular.isFunction( a ) ) {
        instance._onMessagesFirstLoaded = a;
      }
    },
    
    loadMoreMessages: function loadMoreMessages( onMessageLoaded ) {
      instance.messages_to_load += instance.messages_to_load_step;
      // When scrolling to the top, load more messages!
      if ( instance.users[instance.user_id].group_id !== null ) {
        instance.messages[instance.users[instance.user_id].group_id] = [];
        var mr = firebase.database().ref( `/messages/${instance.users[instance.user_id].group_id}` );
        mr.off();
        mr.limitToLast( instance.messages_to_load ).on( 'child_added', instance._addMessage( onMessageLoaded ) );
      }
    },
    
    loadAllMessages: function loadAllMessages( start, end, onMessageLoaded ) {
      // When scrolling to the top, load more messages!
      if ( instance.users[instance.user_id].group_id !== null ) {
        var mr = firebase.database().ref( `/messages/${instance.users[instance.user_id].group_id}` );
        mr.orderByChild( 'when' ).startAt( start ).endAt( end ).once( 'value', function valueRead ( d ) {
          onMessageLoaded( d.val() );
        });
      }
    },
    
    _addMessage: function _addMessage( onMessageLoaded ) {
      return function loadMessage( v ) {
        $timeout( function timeout() {
          var d = v.val();
          instance.getUserData( d.user_id );
          
          if ( angular.isUndefined( instance.messages[instance.users[instance.user_id].group_id]) ) {
            instance.messages[instance.users[instance.user_id].group_id] = [];
          }
          instance.messages[instance.users[instance.user_id].group_id].push( d );
          
          if ( angular.isFunction( onMessageLoaded ) ) {
            onMessageLoaded();
          }
        });
      };
    },
    
    sendMessage: function sendMessage( message, callbackSent ) {
      if ( message !== '' && instance.user_id !== null 
        && instance.users[instance.user_id] && instance.users[instance.user_id].group_id !== null ) {
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
    
    broadastMessage: function broadastMessage ( message ) {
      var when = new Date().getTime();
      if ( message !== '' && instance.user_id !== null ) {
        angular.forEach( instance.groups, function forEach ( group, groupId ) {
          firebase.database().ref( `/messages/${groupId}` ).push({
            user_id: instance.user_id,
            text: message,
            when: when,
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
        });
      });
    },
    
    removeUser: function removeUser ( userId ) {
      instance._removeUserFromAnyOtherGroup( userId );
      var possible = $window.btoa( instance.users[userId].email );
      firebase.database().ref( `/invited/${possible}` ).remove();
      firebase.database().ref( `/users/${userId}` ).remove();
      delete instance.users[userId];
      // We wont remove the messages, we still want them
    },
    
    addUser: function addUser ( groupId, email ) {
      var possible = $window.btoa( email );
      firebase.database().ref( `/invited/${possible}` ).set({
        when: new Date().getTime(),
        group_id: groupId,
      });
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
            instance.removeGroupLocally( groupId );
            if ( angular.isDefined( instance.messages[groupId]) ) {
              delete instance.messages[groupId];
            }
            instance.redrawMdLite();
            return;
          }
          
          // From its data let's get what interests us
          instance.addOrUpdateGroupLocally( groupId, v );
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
    
    addOrUpdateGroupLocally: function addOrUpdateGroupLocally ( groupId, group ) {
      instance.groups[groupId] = group;
      instance.updateLocalGroups();
    },
    
    removeGroupLocally: function removeGroupLocally ( groupId ) {
      delete instance.groups[groupId];
      instance.updateLocalGroups();
    },
    
    updateLocalGroups: function updateLocalGroups () {
      instance.groups_array = [];
      angular.forEach( instance.groups, function foreach ( group ) {
        instance.groups_array.push( group );
      });
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
      // If he is the admin then he still be working on this group
      if ( userId !== instance.user_id ) {
        firebase.database().ref( `/users/${userId}` ).update({ group_id: null });
      }
    },
    
    removeAllUsersFromGroup: function removeAllUsersFromGroup () {
      // We are removing all the users from the current group
      var groupId = instance.users[instance.user_id].group_id;
      angular.forEach( instance.groups[groupId].members, function forEach ( userId ) {
        // If he is the admin then he still be working on this group
        if ( userId !== instance.user_id ) {
          firebase.database().ref( `/users/${userId}` ).update({ group_id: null });
        }
      });
      firebase.database().ref( `/groups/${groupId}/members` ).set([]);
    },
    
    groupExists: function groupExists ( groupName, groupIdToIgnore ) {
      var exists = false;
      angular.forEach( instance.groups, function forEach ( group, groupId ) {
        if ( angular.isDefined( groupIdToIgnore ) && groupIdToIgnore === groupId ) {
          return;
        }
        if ( group.name === groupName ) {
          exists = true;
        }
      });
      return exists;
    },
    
    // UI Stuff
    redrawMdLite: function redrawMdLite() {
      $timeout( componentHandler.upgradeAllRegistered ); // Let's redraw all mdlite components
    },
  };
  return instance;
}
