angular
  .module( 'app' )
  .controller( 'AuthenticationController', authenticationController );
  
authenticationController.$inject = ['$scope', 'Firebase'];


function authenticationController( $scope, Firebase ) {
  // Our variables
  var vm = this;
  vm.state = 'signing_in';
  vm.terms_read = false;
  vm.in_progress = false;
  vm.success_message = '';
  
  // Initialization
  vm.Firebase = Firebase.init();

  // Authentication stuff
  vm.reset = function reset() {
    vm.full_name = vm.email = vm.password = vm.confirm_password = '';
  };
  
  vm.reset();
  vm.errorReset = function errorReset() {
    vm.success_message = vm.error_email = vm.error_password = vm.error_confirm_password = '';
  };
  
  vm.errorReset();
  
  vm.stateChange = function stateChange( s ) {
    vm.reset();
    vm.errorReset();
    vm.state = s;
  };
  
  vm.confirm = function confirm() {
    vm.in_progress = true;
    if ( vm.state === 'registering' ) {
      vm.errorReset();
      
      if ( vm.full_name === '' ) {
        swal( 'Please specify a name', 'Please specify your full name.', 'error' );
      } else if ( vm.password === vm.confirm_password ) {
        Firebase.setPossibleFullName( vm.full_name );
        Firebase.createUserWithEmailAndPassword( vm.email, vm.password, function callback( error ) {
          if ( error.code === 'auth/weak-password' ) {
            vm.error_password = error.message;
          } else {
            vm.error_email = error.message;
          }
          vm.in_progress = false;
        });
      } else {
        vm.error_confirm_password = 'The password and its confirmation do not match.';
        vm.in_progress = false;
      }
      
    } else if ( vm.state === 'signing_in' ) {
      Firebase.signInWithEmailAndPassword( vm.email, vm.password, function callback( error ) {
        if ( error.code === 'auth/wrong-password' ) {
          vm.error_password = error.message;
        } else {
          vm.error_email = error.message;
        }
        vm.in_progress = false;
      });
    }
  };
  
  vm.resetPassword = function resetPassword() {
    Firebase.sendPasswordResetEmail( vm.email, function callbackSuccess() {
      vm.success_message = 'An email has been sent to this address with further instructions.';
      vm.in_progress = false;
    }, function callbackError( error ) {
      vm.error_email = error.message;
      vm.in_progress = false;
    });
  };  
}

