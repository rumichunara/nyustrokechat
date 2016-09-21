/*eslint max-statements: 1*/


var jQuery = require( '../../../node_modules/jquery/dist/jquery.min' );
var date = require( '../../../node_modules/locutus/php/datetime/date' );
var fileSaver = require( '../../../public/js/filesaver.min' );
require( '../../../public/js/sweetalert.min' );


angular
  .module( 'app' )
  .controller( 'HomeController', homeController );
  
  
homeController.$inject = ['Firebase', '$timeout', '$document', '$window'];


function homeController( Firebase, $timeout, $document, $window ) {
  
  var vm = this;
  vm.Firebase = Firebase.init();
  
  vm.my_profile_visible = false;
  vm.editing_profile = false;
  vm.search = '';
  
  vm.mobile_show = 'ChatMessages';
  vm.is_mobile = ( $window.innerWidth <= 839 );
  
  vm.sending_message = false;
  vm.new_message = '';
  vm.last_message_loaded = -1;
  
  vm.from = date('Y-m-d');
  vm.to = date('Y-m-d');

  
  //Profile stuff
  vm.showMyProfile = function showMyProfile ( b ) {
    vm.my_profile_visible = b;
    $timeout( function domManipulate() { 
      if ( !vm.my_profile_visible ) {
        jQuery( '.mdl-layout__obfuscator, .mdl-layout__drawer' ).removeClass( 'is-visible' );
      }
    });
  };
  
  vm.toggleEditProfile = function toggleEditProfile() {
    vm.editing_profile = !vm.editing_profile;
  };
  
  vm.editProfileConfirm = function editProfileConfirm ( e ) {
    if ( e.code === 'Enter' ) {
      vm.editing_profile = false;
      Firebase.editUserProfileName( Firebase.users[Firebase.user_id].name );
    }
  };
  
  vm.selectProfilePicture = function selectProfilePicture () {
    $document[0].getElementById( 'profile_picture_file' ).click();
  };
  
  vm.uploadProfilePicture = function uploadProfilePicture ( e ) {
    var file = e.target.files[0];
    if ( !file.type.match( 'image.*' ) ) {
      return;
    }
    Firebase.saveProfilePicture( file );
  };
  
  vm.getProfilePicture = function getProfilePicture ( u ) {
    if ( u === null || angular.isUndefined( u ) 
        || angular.isUndefined( u.profile_picture_url ) || u.profile_picture_url === '' ) {
      return '/img/avatar.png';
    } else { 
      return u.profile_picture_url;
    }
  };
  
  vm.showProfile = function showProfile ( userId ) {
    Firebase.getUserData( userId, function callback () {
      var usr = Firebase.users[userId];
      var imgSrc = vm.getProfilePicture( usr );
      var usrName = usr.name;
      var usrEmail = (usr.email) ? usr.email : '';
      var joinedDate = date( 'F j, Y', new Date( usr.joined ) );
      var lastActive = date( 'F j, Y', new Date( usr.last_active ) );

      var t = `
        <div class="profile">
          <div class="image" style="background-image: url('${imgSrc}')" ></div>
          <div class="name">${usrName}</div>
          <div class="email">${usrEmail}</div>
          <div class="joined">Joined <span>${joinedDate}</span></div>
          <div class="last">Last time active <span>${lastActive}</span></div>
        </div>
      `;

      swal({title: '', text: t, html: true});
    });      
  };
  
  
  // Chat stuff
  
  // Workaround for scrolling to bottom when group is loaded but not at any other moment
  Firebase.addOnMessageLoaded( function callback () {
    $timeout( function scrollToBottomOnStart () {
      var t = new Date().getTime();
      if ( Firebase.last_message_loaded === -1 || t - Firebase.last_message_loaded < 100 ) {
        Firebase.setLastMessageLoaded( t );
        jQuery( '#messages_list' ).scrollTop( jQuery( '#messages_list' ).prop( 'scrollHeight' ) );
      }
    }, 0 );
  });
  
  vm.sendMessage = function sendMessage ( m ) {
    vm.new_message = ''; // For not losing focus when pressing enter
    vm.sending_message = true;
    Firebase.sendMessage( m, function callback () {
      vm.sending_message = false;
      jQuery( '#messages_list' ).scrollTop( jQuery( '#messages_list' ).prop( 'scrollHeight' ) );
    });
  };
  
  vm.messageKeypressed = function messageKeypressed ( e ) {
    if ( e.code === 'Enter' ) {
      var m = vm.new_message; // For not losing focus when pressing enter
      vm.new_message = ''; // For not losing focus when pressing enter
      vm.sendMessage( m );
      e.preventDefault(); // For not losing focus when pressing enter
    }
  };
  
  vm.downloadLog = function downloadLog () {
    var dialog = $document[0].querySelector('dialog.download-log');
    dialog.showModal();
  };
  
  vm.dontDownloadLog = function () {
    var dialog = $document[0].querySelector('dialog.download-log');
    dialog.close();
  }
  
  vm.downloadLogFile = function downloadLogFile () {   
    if ( !vm.Firebase.users[vm.Firebase.user_id].admin ) {
      return;
    }
    
    var groupId = vm.Firebase.users[vm.Firebase.user_id].group_id;
    var escapeString = function escapeString ( s ) {
      var innerValue = ( s === null ) ? '' : s.toString();
      var result = innerValue.replace( /"/g, '""' );
      if ( result.search( /("|,|\n)/g ) >= 0 ) {
        result = `"${result}"`;
      }
      return result;
    };
            
    var lineArray = [];
    angular.forEach( vm.Firebase.messages[groupId], function forEach ( d ) {
      var t = date( 'Y-m-d H:i:s', new Date( d.when ) );
      if (t >= `${vm.from} 00:00:00` && t <= `${vm.to} 23:59:59`) {
        lineArray.push( `${t},${escapeString( Firebase.users[d.user_id].name )},${escapeString( d.text )}` );
      }
    });
    var csvContent = lineArray.join( '\n' );

    fileSaver.saveAs( new Blob([csvContent] , {type: 'text/csv;charset=utf-8;'}), 'log.csv' );
  };
  
  
  // Admin stuff
  vm.addGroup = function addGroup() {
    swal({
      title: 'Add a group',   
      text: 'Add a new group with the following name',   
      type: 'input',   
      showCancelButton: true,   
      closeOnConfirm: true,   
      inputPlaceholder: 'Group name', 
    }, 
    function response ( inputValue ) {
      if ( inputValue === false ) {
        return false;
      }
      if ( inputValue === '' ) {
        swal.showInputError( 'You need to write a name' );     
        return false;
      }
      
      Firebase.addGroup( inputValue );
    });
  };
  
  
  vm.selectGroup = function selectGroup( groupId ) {
    Firebase.selectGroup( groupId );
  };
  
  
  vm.renameGroup = function renameGroup() {
    swal({
      title: 'Edit group name',   
      text: 'Rename the group to the following',   
      type: 'input',   
      showCancelButton: true,   
      closeOnConfirm: true,   
      inputPlaceholder: 'Group name',
      inputValue: Firebase.groups[Firebase.users[Firebase.user_id].group_id].name,
    }, 
    function response( inputValue ) {
      if ( inputValue === false ) {
        return false;
      }
      if ( inputValue === '' ) {
        swal.showInputError( 'You need to write a name' );     
        return false;
      }
      
      Firebase.editGroupName( Firebase.users[Firebase.user_id].group_id, inputValue );
    });
  };
  
  
  vm.deleteGroup = function deleteGroup() {
    swal({
      title: 'Delete group',   
      text: 'Are you sure you want to delete the group? This action can\'t be undone',   
      type: 'warning',   
      showCancelButton: true,   
      closeOnConfirm: true,
      confirmButtonText: 'Yes, delete it',
    }, 
    function response () {
      Firebase.deleteGroup( Firebase.users[Firebase.user_id].group_id );
    });
  };
  
  
  vm.addUserToCurrentGroup = function addUserToCurrentGroup( userId ) {
    Firebase.addUserToGroup( userId, Firebase.users[Firebase.user_id].group_id );
  };
  
  
  vm.removeUserFromCurrentGroup = function removeUserFromCurrentGroup( userId ) {
    Firebase.removeUserFromGroup( userId );
  };
  
  
  vm.removeUser = function removeUser( userId ) {
    swal({
      title: 'Delete user',   
      text: 'Are you sure you want to delete the user? This action can\'t be undone',   
      type: 'warning',   
      showCancelButton: true,   
      closeOnConfirm: true,
      confirmButtonText: 'Yes, delete it',
    }, 
    function response () {
      Firebase.removeUser( userId );
    });
  };
  
  
  vm.validEmail = function validEmail ( e ) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test( e );
  };
  
  
  vm.addUser = function addUser () {
    if ( Firebase.users[Firebase.user_id].group_id === null ) {
      swal( 'Select a group', 'Please select a group first.', 'error' );
      return;
    }
    
    var groupName = Firebase.groups[Firebase.users[Firebase.user_id].group_id].name;
    swal({
      title: `Invite a user to the group "${groupName}"`,   
      text: 'Please write the email address of the person you want to invite',   
      type: 'input',   
      showCancelButton: true,   
      closeOnConfirm: false,   
      inputPlaceholder: 'Email address',
    }, 
    function response ( inputValue ) {
      if ( inputValue === false ) {
        return false;
      }
      if ( inputValue === '' ) {
        swal.showInputError( 'You need to write an email address' );     
        return false;
      }
      
      if ( !vm.validEmail( inputValue ) ) {
        swal.showInputError( 'You need to write a valid email address' ); 
        return false;
      }
      
      Firebase.addUser( Firebase.users[Firebase.user_id].group_id, inputValue );
      swal( 'User invited', 'The person behind that email address has been invited.', 'success' );
    });
  };
  
  
  // Mobile mode
  vm.mobileShow = function mobileShow ( what ) {
    vm.mobile_show = what;
    vm.showMyProfile( false );
  };
  
  vm.isMobileCalculate = function isMobileCalculate () {
    $timeout( function timeout () {
      vm.is_mobile = ( $window.innerWidth <= 839 );
    });
  };
  angular.element( $window ).bind( 'load', vm.isMobileCalculate );
  angular.element( $window ).bind( 'resize', vm.isMobileCalculate );
}
