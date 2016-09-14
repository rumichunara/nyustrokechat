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
  
  Firebase.assignwhenNewMessage( function whenNewMessage( m ) {
    vm.messages.push( m );

    // Workaround for scrolling to the bottom on start but never again
    $timeout( function scrollToBottomOnStart () {
      var t = new Date().getTime();
      if ( vm.last_message_loaded === -1 || t - vm.last_message_loaded < 100 ) {
        vm.last_message_loaded = t;
        jQuery( '#messages_list' ).scrollTop( jQuery( '#messages_list' ).prop( 'scrollHeight' ) );
      }
    }, 0 );
  });
  
  vm.my_profile_visible = false;
  vm.editing_profile = false;
  
  vm.sending_message = false;
  vm.new_message = '';
  vm.messages = [];
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
        || angular.isUndefined( u.profile_picture ) || u.profile_picture === '' ) {
      return '/img/avatar.png';
    } else { 
      return u.profile_picture;
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

    angular.forEach( vm.messages, function forEach ( d ) {
      var t = new Date( d.when );
      var strDate = date( 'Y-m-d H:i:s', t );
      var usrName = Firebase.users[d.user_id].name;
      var msg = Firebase.users[d.user_id].message;

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
}
