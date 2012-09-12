/* learning


 Factory methods are responsible for creating most objects in Angular :: directives, services, and filters
        ## define a service by registering a service factory function with a module either via the Module#factory api or 
        ## directly via the $provide api inside of module config function
        
        factory('serviceId', ['depService', function(depService) {
        
           ## To use an angular service, you identify it as a dependency for the dependent (a controller, or another service) 
           ## that depends on the service. Angular's dependency injection subsystem takes care of the rest.
            
        directive('directiveName', ['depService', function(depService) {
        filter('filterName', ['depService', function(depService) {
            ## Angular filters format data for display to the user. I
        
        
*/

// defines the 'myapp' module.

// modules : configure existing services, define new services, 
// mobile : 'myapp' is dependent on other mobules (chatter)

// angular.module is a global place for creating and registering Angular modules
angular.module('myapp', [ /* 'mongolab' */] ).
    // // configure existing services inside initialization blocks ($routeProvider service)
    config(function($routeProvider) {
        $routeProvider.
        // when '/' is loaded, load the list.html into the view & attach the 'ListCtrl' Controller.
        when('/home', {controller:ListCtrl, templateUrl:'angular/view/home.html'}).
        when('/register', {controller:RegisterCtrl, templateUrl:'angular/view/register.html'}).
        //when('/edit/:projectId', {controller:EditCtrl, templateUrl:'detail.html'}).
        //when('/new', {controller:CreateCtrl, templateUrl:'detail.html'}).
        
        otherwise({redirectTo:'/'});
    }).run(function($http, $rootScope, $location) {
        console.log ('checking if logged on');
        $http.get('/ajaxlogin').success(function(data) {
            console.log ('got results : ' + angular.toJson(data, true));
            $rootScope.authenticated = true;
            $rootScope.userdata = data.userdata;
            $rootScope.logout = function() {
                $http.get('/logout').success(function(data) {
                    console.log ('logged out');
                    $location.path('/');
                    $rootScope.authenticated = null;
                     $rootScope.userdata = null;
                    
                });
            }
        });
          
    }).factory('authentication', ['$http', function(http) {
       // define new singleton service - authentication!
      
        //factory function body that constructs shinyNewServiceInstance
        return null;
    }]);
 
 
    function ListCtrl($scope /* , Project */) {
      $scope.ModelData = 'Keith';
    }
    
    // To use a service in angular, you simply declare the names of the dependencies you need as arguments
    // to the controller's constructor function
    // Note that the names of arguments are significant, because the injector uses these to look up the dependencies 
    function LoginCtrl($scope, $http, $rootScope, $location) {
       // $scope.username (can default username)
      $scope.submit = function() {
        console.log ('calling LoginCtrol.save '  + $scope.username);
        // one of angular's built-in services called $http
        // The $http service returns a promise object with a success method
        $http.post('/ajaxlogin', {username: $scope.username}).success(function(data) {
            console.log ('got results : ' + angular.toJson(data, true));
            $rootScope.authenticated = true;
            $rootScope.userdata = data.userdata;
            $location.path('/home');
          });  
      }
    }
    
    function RegisterCtrl($scope) {
        
    }
 
    /*
    function CreateCtrl($scope, $location, Project) {
      $scope.save = function() {
        Project.save($scope.project, function(project) {
          $location.path('/edit/' + project._id.$oid);
        });
      }
    }
     
    function EditCtrl($scope, $location, $routeParams, Project) {
      var self = this;
     
      Project.get({id: $routeParams.projectId}, function(project) {
        self.original = project;
        $scope.project = new Project(self.original);
    });
    
 
    $scope.isClean = function() {
        return angular.equals(self.original, $scope.project);
    }
     
    $scope.destroy = function() {
        self.original.destroy(function() {
          $location.path('/list');
        });
    };
     
    $scope.save = function() {
        $scope.project.update(function() {
          $location.path('/');
        });
    };
    */
