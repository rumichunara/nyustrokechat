var jQuery = require( '../../../node_modules/jquery/dist/jquery.min' );
var date = require( '../../../node_modules/locutus/php/datetime/date' );
var fileSaver = require( '../../../public/js/filesaver.min' );
require( '../../../public/js/sweetalert.min' );


angular
  .module( 'app' )
  .controller( 'HomeController', homeController );
  
  
homeController.$inject = ['Firebase', '$timeout', '$document'];


function homeController( Firebase, $timeout, $document ) {
  
  var vm = this;
  vm.Firebase = Firebase.init();
  
  vm.my_profile_visible = false;
  vm.editing_profile = false;
  
  vm.sending_message = false;
  vm.new_message = '';
  vm.last_message_loaded = -1;

  
  //Profile stuff
  vm.showMyProfile = function showMyProfile ( b ) {
    vm.my_profile_visible = b;
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
      var usrEmail = usr.email;
      var joinedDate = date( 'F j, Y', new Date( usr.joined ) );
      var lastActive = date( 'F j, Y', new Date( usr.last_active ) );

      var t = `
        <div class="profile">
          <img src="${imgSrc}" />
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
    var cl = '';
    
    if ( !vm.Firebase.users[vm.Firebase.user_id].admin ) {
      return;
    }

    var groupId = vm.Firebase.users[vm.Firebase.user_id].group_id;
    angular.forEach( vm.Firebase.messages[groupId], function forEach ( d ) {
      var t = new Date( d.when );
      var strDate = date( 'Y-m-d H:i:s', t );
      var usrName = Firebase.users[d.user_id].name;
      var msg = d.text;

      cl = `${cl}<tr><td>${strDate}</td><td>${usrName}</td><td>${msg}</td></tr>`;
    });
    
    var c = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" 
        xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
          <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
          <x:Name>Log</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
          </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        </head>
        <body>
          <table>${cl}</table>
        </body>
      </html>
    `;
    
    fileSaver.saveAs( new Blob([c] , {type: 'application/vnd.ms-excel;charset=UTF-8'}), 'log' );
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
      inputPlaceholder: 'Email addres',
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
}
