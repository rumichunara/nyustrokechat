angular
  .module( 'app' )
  .factory( 'Firebase', FirebaseService );


// Services
FirebaseService.$inject = ['$rootScope', '$state', '$timeout'];

function FirebaseService( $rootScope, $state, $timeout ) {
  var instance = {
    
    whenNewMessage: function dummy(){},
    
    user_id: null,
    users: {},
    groups: {},
    max_members_per_group: 6,
    
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
            firebase.database()
              .ref( `/users/${instance.user_id}` )
              .update({ last_active: new Date().getTime() });          

            // Lets get the rest of the info of the user, then well load the messages
            // (because we need to know the group he belongs to)
            instance.getUserData( instance.user_id, function callback () {
              // We already have this field but not in the users list
              // we have to wait until the entry exists
              instance.users[instance.user_id].email = user.email;
              // Let's get the user's group data
              instance.getGroupData( instance.users[instance.user_id].group_id, instance.loadMessages );
              
              // If its an admin
              if ( instance.users[instance.user_id].admin ) {
                instance.getAllUsers();
                instance.getAllGroups();
              }
            });
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
      $timeout( function upgradeAllRegistered() {
        componentHandler.upgradeAllRegistered();
      });
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
    _loadUserData: function _loadUserData ( userId, v ) {
      var attributes = ['user_id', 'name', 'email', 'group_id', 'joined'];
      angular.forEach( attributes, function forEach ( d ) {
        instance.users[userId][d] = ( angular.isDefined( v[d]) ) ? v[d] : '';
      });
      instance.users[userId]['admin'] = ( angular.isDefined( v['admin']) ) ? v['admin'] : false;
    },
    
    getUserData: function getUserData( userId, onGet ) {
      
      // If we already have the user data then we dont search for it
      if ( angular.isDefined( instance.users[userId]) ) {
        if ( angular.isFunction( onGet ) ) {
          onGet();
        }
        return;
      }
      
      // If that is not the case we'll search for it
      instance.users[userId] = {};
      
      // Let's assign a color for the user, if there are no more colors available then we start again
      instance.last_color_used += 1;
      if ( instance.last_color_used >= instance.colors.length ) {
        instance.last_color_used = 0;
      }
      instance.users[userId].color = instance.colors[instance.last_color_used];
      
      // Let's request all the data
      var r = firebase.database().ref( `/users/${userId}` );
      r.on( 'value', function valueAssigned( s ) {
        $timeout( function timeout() {
          var v = s.val();
          
          instance._loadUserData( userId, v );
          
          if ( instance.users[userId].joined === '' ) {
            firebase.database().ref( `/users/${userId}` ).update({ joined: new Date().getTime() });
          }
          
          if ( angular.isFunction( onGet ) ) {
            onGet();
          }
          
          // Let'g get the profile URL if it is needed
          var url = ( angular.isDefined( v.profile_picture ) ) ? v.profile_picture : '';
          instance.getUrlOfImage( url, function onGetUrlOfImage( r ) { 
            instance.users[userId].profile_picture = r;
          });
          
          r.off(); // I dont want to excecute this every time user data changes
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
            instance.users[instance.user_id].profile_picture = r;
          });
        });
      }
    },
    

    // Message stuff
    assignwhenNewMessage: function assignwhenNewMessage( d ) {
      instance.whenNewMessage = d;
    },
    
    loadMessages: function loadMessages() {
      if ( instance.users[instance.user_id].group_id !== '' ) {
        var mr = firebase.database().ref( `/messages/${instance.users[instance.user_id].group_id}` );
        mr.off();
        mr.on( 'child_added', instance._addMessage );
        mr.on( 'child_changed', instance._addMessage );
      }
    },
    
    _addMessage: function addMessage( v ) {
      $timeout( function timeout() {
        var d = v.val();
        // Let´s get the extra data of the message
        instance.getUserData( d.user_id );
        instance.whenNewMessage( d );
        
        // When a message is loaded we save the "last active" timestamp
        instance.users[instance.user_id].last_active = new Date().getTime();
        firebase.database()
          .ref( `/users/${instance.user_id}` )
          .update({ last_active: instance.users[instance.user_id].last_active });
      });
    },
    
    sendMessage: function sendMessage( message, callbackSent ) {
      if ( message !== '' && instance.user_id !== null ) {
        firebase.database().ref( `/messages/${instance.users[instance.user_id].group_id}` ).push({
          user_id: instance.user_id,
          text: message,
          when: new Date().getTime(),
        }).then( function onMessageGet() {
          $timeout( function timeout() {
            callbackSent();
          });
        }).catch( function onMessageError() {
          $timeout( function timeout() {
            callbackSent();
          });
        });
      }
    },
    
    
    // Groups stuff
    _loadGroupData: function _loadGroupData ( groupId, v ) {
      var attributes = ['group_id', 'name'];
      angular.forEach( attributes, function forEach ( d ) {
        instance.groups[groupId][d] = ( angular.isDefined( v ) && angular.isDefined( v[d]) ) ? v[d] : '';
      });
      instance.groups[groupId]['members'] = ( angular.isDefined( v ) 
        && angular.isDefined( v['members']) ) ? v['members'] : {};
    },
    
    getGroupData: function getGroupData( groupId, onGet ) {
      
      if ( angular.isDefined( instance.groups[groupId]) ) {
        return;
      }
      
      instance.groups[groupId] = {};
            
      // Let's request all the data
      var r = firebase.database().ref( `/groups/${groupId}` );
      r.on( 'value', function onGetValue( s ) {
        $timeout( function timeout() {
          var v = s.val();
          
          // From its data let's get what interests us
          instance._loadGroupData( groupId, v );
          instance.groups[groupId].members_count = 0;
          
          angular.forEach( instance.groups[groupId].members, function forEachGroup( userId ) {
            instance.getUserData( userId );
            instance.groups[groupId].members_count += 1;
          });
          
          if ( angular.isFunction( onGet ) ) {
            onGet();
          }
          
          r.off();          
        });
      });
    },
    
    
    // Admin stuff
    getAllUsers: function getAllUsers() {
      var r = firebase.database().ref( '/users/' );
      r.on( 'child_added', function childAdded( s ) {
        $timeout( function timeout() {
          instance.getUserData( s.val().user_id );
          r.off();
        });
      });
    },
    
    
    getAllGroups: function getAllGroups() {
      var r = firebase.database().ref( '/groups/' );
      r.on( 'child_added', function childAdded( s ) {
        $timeout( function timeout() {
          instance.getGroupData( s.val().group_id );
          r.off();
        });
      });
    },
  };
  return instance;
}
