
var pg = angular.module('mrak.pagination', []);

pg.constant('paginationConfig', {
  itemsPerPage: 10,
  boundaryLinks: false,
  directionLinks: true,
  firstText: 'First',
  previousText: 'Previous',
  nextText: 'Next',
  lastText: 'Last',
  rotate: true
});

pg.controller('PaginationCntrl', function ($scope, $attrs, $parse) {
  var self = this;
  var ngModelCtrl = { $setViewValue: angular.noop }; // nullModelCtrl
  var setNumPages = $attrs.numPages ? $parse($attrs.numPages).assign : angular.noop;

  this.init = function(ngModelCtrl_, config) {
    ngModelCtrl = ngModelCtrl_;
    this.config = config;

    ngModelCtrl.$render = function() {
      self.render();
    };

    if ($attrs.itemsPerPage) {
      $scope.$parent.$watch($parse($attrs.itemsPerPage), function(value) {
        self.itemsPerPage = parseInt(value, 10);
        $scope.totalPages = self.calculateTotalPages();
      });
    } else {
      this.itemsPerPage = config.itemsPerPage;
    }
  };

  this.calculateTotalPages = function() {
    var totalPages = this.itemsPerPage < 1 ? 1 : Math.ceil($scope.totalItems / this.itemsPerPage);
    return Math.max(totalPages || 0, 1);
  };

  this.render = function() {
    $scope.page = parseInt(ngModelCtrl.$viewValue, 10) || 1;
  };

  $scope.selectPage = function(page) {
    if ( $scope.page !== page && page > 0 && page <= $scope.totalPages) {
      ngModelCtrl.$setViewValue(page);
      ngModelCtrl.$render();
    }
  };

  $scope.getText = function( key ) {
    return $scope[key + 'Text'] || self.config[key + 'Text'];
  };
  $scope.noPrevious = function() {
    return $scope.page === 1;
  };
  $scope.noNext = function() {
    return $scope.page === $scope.totalPages;
  };

  $scope.$watch('totalItems', function() {
    $scope.totalPages = self.calculateTotalPages();
  });

  $scope.$watch('totalPages', function(value) {
    setNumPages($scope.$parent, value); // Readonly variable

    if ( $scope.page > value ) {
      $scope.selectPage(value);
    } else {
      ngModelCtrl.$render();
    }
  });

});

pg.directive('pagination', function($parse, paginationConfig) {

 	var pgLink = function(scope, element, attrs, ctrls) {
 		var paginationCtrl = ctrls[0];
 		var ngModelCtrl    = ctrls[1];

    if (!ngModelCtrl) {
      return; // do nothing if no ng-model
    }

	 	function evalOrDefault(param, defaultValue) {
	 		return angular.isDefined(param) ? scope.$parent.$eval(param) : defaultValue
	 	}

		// Setup configuration parameters
		var maxSize          = evalOrDefault(attrs.maxSize, paginationConfig.maxSize);
		var rotate           = evalOrDefault(attrs.rotate, paginationConfig.rotate);
		scope.boundaryLinks  = evalOrDefault(attrs.boundaryLink, paginationConfig.boundaryLinks);
		scope.directionLinks = evalOrDefault(attrs.directionLinks, paginationConfig.directionLinks);

		paginationCtrl.init(ngModelCtrl, paginationConfig);

    if (attrs.maxSize) {
      scope.$parent.$watch($parse(attrs.maxSize), function(value) {
      	maxSize = parseInt(value, 10);
        paginationCtrl.render();
      });
    }

    // Create page object used in template
    function preparePage(number, text, isActive) {
      return {
        number: number,
        text: text,
        active: isActive
      };
    }

    // for each page link prepare number, text and check if its active
    function preparePages(currentPage, totalPages) {
      var pages = [];

      // Default page limits
      var startPage  = 1;
      var endPage    = totalPages;
      var isMaxSized = ( angular.isDefined(maxSize) && maxSize < totalPages );

      // recompute if maxSize
      if ( isMaxSized ) {
        if ( rotate ) {
          // Current page is displayed in the middle of the visible ones
          startPage = Math.max(currentPage - Math.floor(maxSize/2), 1);
          endPage   = startPage + maxSize - 1;

          // Adjust if limit is exceeded
          if (endPage > totalPages) {
            endPage   = totalPages;
            startPage = endPage - maxSize + 1;
          }
        } else {
          // Visible pages are paginated with maxSize
          startPage = ((Math.ceil(currentPage / maxSize) - 1) * maxSize) + 1;

          // Adjust last page if limit is exceeded
          endPage = Math.min(startPage + maxSize - 1, totalPages);
        }
      }

      // Add page number links
      for (var number = startPage; number <= endPage; number++) {
        var page = preparePage(number, number, number === currentPage);
        pages.push(page);
      }

      // Add links to move between page sets
      if ( isMaxSized && ! rotate ) {
        if ( startPage > 1 ) {
          var previousPageSet = preparePage(startPage - 1, '...', false);
          pages.unshift(previousPageSet);
        }

        if ( endPage < totalPages ) {
          var nextPageSet = preparePage(endPage + 1, '...', false);
          pages.push(nextPageSet);
        }
      }

      return pages;
    }

    var originalRender = paginationCtrl.render;
    paginationCtrl.render = function() {
      originalRender();
      if (scope.page > 0 && scope.page <= scope.totalPages) {
        scope.pages = preparePages(scope.page, scope.totalPages);
      }
    };

 	}
 	
  return {
    restrict: 'EA',
    scope: {
	    totalItems: '=',
	    firstText: '@',
	    previousText: '@',
	    nextText: '@',
    	lastText: '@'	    	
    },
    require: ['pagination', '?ngModel'],
    controller: 'PaginationController',
    templateUrl: 'template/pagination/pagination.html',
    replace: true,
    link: pgLink
  }
});