var date = require( '../../../node_modules/locutus/php/datetime/date' );
var fileSaver = require( '../../../public/js/filesaver.min' );
require('../../../public/js/sweetalert.min');


angular
  .module('app')
  .controller('HomeController', homeController);
  
  
homeController.$inject = ['$rootScope', '$window', '$scope', 'Firebase', '$timeout'];


function homeController($rootScope, $window, $scope, Firebase, $timeout) {
  
  $scope.Firebase = Firebase.init();
  
  Firebase.whenNewMessage = function (m) {
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
  };
  
  $scope.my_profile_visible = false;
  $scope.editing_profile = false;
  
  $scope.sending_message = false;
  $scope.new_message = '';
  $scope.messages = [];
  $scope.last_message_loaded = -1;

  
  //Profile stuff
  $scope.showMyProfile = function (b) {
    $scope.my_profile_visible = b;
  };
  
  $scope.toggleEditProfile = function () {
    $scope.editing_profile = !$scope.editing_profile;
  }
  
  $scope.editProfileConfirm = function (e) {
    if (e.code == 'Enter') {
      $scope.editing_profile = false;
      Firebase.editUserProfileName(Firebase.users[Firebase.user_id].name);
    }
  }
  
  $scope.selectProfilePicture = function () {
    document.getElementById('profile_picture_file').click();
  }
  
  $scope.uploadProfilePicture = function (e) {
    var file = e.target.files[0];
    if (!file.type.match('image.*'))
      return;
    Firebase.saveProfilePicture(file);
  }
  
  $scope.getProfilePicture = function (u) {
     return (u == null || u.profile_picture == undefined || u.profile_picture == '') ? '/img/avatar.png' : u.profile_picture;
  }
  
  $scope.showProfile = function (user_id) {
      
      Firebase.getUserData(user_id, function () {
        var t = '';
        t += '<div class="profile">';
        t += '  <img src="' + $scope.getProfilePicture(Firebase.users[user_id]) + '" />';
        t += '  <div class="name">' + Firebase.users[user_id].name + '</div>';
        t += '  <div class="email">' + Firebase.users[user_id].email + '</div>';
        t += '  <div class="joined">Joined <span>' + date('F j, Y', new Date(Firebase.users[user_id].joined)) + '</span></div>';
        t += '  <div class="last">Last time active <span>' + date('F j, Y', new Date(Firebase.users[user_id].last_active)) + '</span></div>';
        t += '</div>';
        swal({title: '', text: t, html: true});
      });
      
  },
  
  
  // Chat stuff
  
  $scope.sendMessage = function (m) {
    $scope.new_message = ''; // For not losing focus when pressing enter
    $scope.sending_message = true;
    Firebase.sendMessage(m, function () {
      $scope.sending_message = false;
      jQuery('#messages_list').scrollTop(jQuery('#messages_list').prop("scrollHeight"));
    });
  }
  
  $scope.messageKeypressed = function (e) {
    if (e.code == 'Enter') {
      var m = $scope.new_message; // For not losing focus when pressing enter
      $scope.new_message = ''; // For not losing focus when pressing enter
      $scope.sendMessage(m);
      e.preventDefault(); // For not losing focus when pressing enter
    }
  }
  
  $scope.downloadLog = function () {
    var cl = '';
    angular.forEach($scope.messages, function (d, i) {
      var t = new Date(d.when);
      cl += '<tr>' + '<td>' + date('Y-m-d H:i:s', t) + '</td>' + '<td>' + Firebase.users[d.user_id].name + '</td>' + '<td>' + Firebase.users[d.user_id].message + '</td>' + '</tr>';
    });
    
    var c = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Log</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>' + cl + '</table></body></html>';
    
    fileSaver.saveAs(new Blob([c] , {type: "application/vnd.ms-excel;charset=UTF-8"}), 'log' );
  }
}
