angular
  .module("nobel-software", ["ngRoute", "ngSanitize", "ngPDFViewer"])
  .config(function ($routeProvider, $locationProvider) {
    $routeProvider
      .when("/", {
        templateUrl: "/partials/home.htm",
        controller: "homeController",
        title: "Nobel Software",
      })
      .when("/:name/authors/", {
        templateUrl: "/partials/authors.htm",
        controller: "authorsController",
      })
      .when("/:name/papers/", {
        templateUrl: "/partials/papers.htm",
        controller: "papersController",
      })
      .when("/404", {
        templateUrl: "/partials/404.htm",
        title: "Page not found - Nobel Software",
      })
      .otherwise({
        templateUrl: "/partials/404.htm",
        title: "Page not found - Nobel Software",
      });
    // $locationProvider.html5Mode(true);
  })
  .filter("title", function () {
    return function (str) {
      if (!str) return str;

      str = str.toLowerCase();
      var words = str.split(" ");

      var capitalized = words.map(function (word) {
        return word.charAt(0).toUpperCase() + word.substring(1, word.length);
      });
      return capitalized.join(" ");
    };
  })
  .controller("mainController", [
    "$scope",
    "$http",
    "$location",
    function ($scope, $http, $location) {
      $scope.laureates = [];
      $scope.filters = { categories: {}, matched: true };

      $scope.orderBy = ""; //"-fistname";

      $scope.selectLaureate = (laureate) => {
        $location.url(laureate.normalizedName + "/papers/");
        return true;
      };

      async function getLaureates() {
        $scope.laureates = (await $http.get("/api/nobels")).data.reverse();
        for (const laureate of $scope.laureates) {
          for (const prize of laureate.prizes) {
            $scope.filters.categories[prize.category] = true;
          }
        }
        $scope.$apply();
      }
      getLaureates();

      $scope.darkMode = function (on) {
        localStorage.setItem("darkMode", on);
        $scope.isDarkMode = on;
        if (on) {
          $("body").addClass("dark-mode");
        } else {
          $("body").removeClass("dark-mode");
        }
        $scope.$broadcast("dark-mode", on);
      };

      $scope.laureateFilter = (laureate) => {
        if ($scope.filters.matched && !laureate.id) {
          return false;
        }
        let output = true;
        for (const prize of laureate.prizes) {
          output = $scope.filters.categories[prize.category] && output;
        }
        if (!output) {
          return false;
        }
        if ($scope.search) {
          if (laureate.normalizedName.toLowerCase().indexOf($scope.search.toLowerCase()) > -1) {
            return true
          }
          if (laureate.description && laureate.description.toLowerCase().indexOf($scope.search.toLowerCase()) > -1) {
            return true
          }
          return false;
        }
        return true;
      };

      $scope.darkMode(localStorage.getItem("darkMode") == "true");

      function changedUrl(_, current) {
        if (current) {
          $scope.title = current.title;
        }
      }

      $scope.$on("$routeChangeSuccess", changedUrl);
      $scope.$on("$routeUpdate", changedUrl);
    },
  ])
  .controller("homeController", [function () {}])
  .controller("authorsController", [
    "$scope",
    "$routeParams",
    "$http",
    "$location",
    function ($scope, $routeParams, $http, $location) {
      $scope.$watch("laureates", () => {
        if (!$scope.laureates.length) return;
        $scope.laureate = $scope.laureates.filter(
          (l) => $routeParams.name == l.normalizedName
        )[0];

        $scope.search =
          $routeParams.name +
          " from " +
          $scope.laureate.prizes[0].affiliations[0].name;
      });
      $scope.authors = [];

      async function getAuthors() {
        const res = (
          await $http.get("/api/laureate/" + $routeParams.name + "/search")
        ).data;
        $scope.authors = res.de;
        $scope.$apply();
      }
      getAuthors();

      $scope.look = async function () {
        const res = (
          await $http.get(
            "/api/laureate/" +
              $routeParams.name +
              "/search?query=" +
              $scope.search
          )
        ).data;
        $scope.authors = res.de;
        $scope.$apply();
      };

      $scope.selectAuthor = async function (author) {
        $scope.laureates.filter(
          (l) => $routeParams.name == l.normalizedName
        )[0].mId = author.id;
        await $http.post("/api/laureate/" + $routeParams.name + "/author", {
          mId: author.id,
        });
      };
    },
  ]).controller("papersController", [
    "$scope",
    "$routeParams",
    "$http",
    "$location",
    function ($scope, $routeParams, $http, $location) {
      $scope.$watch("laureates", () => {
        if (!$scope.laureates.length) return;
        $scope.laureate = $scope.laureates.filter(
          (l) => $routeParams.name == l.normalizedName
        )[0];
      });
      $scope.papers = [];

      async function getPapers() {
        const res = (
          await $http.get("/api/laureate/" + $routeParams.name + "/papers")
        ).data;
        $scope.papers = res;
        $scope.$apply();
      }
      getPapers();

      $scope.selectPaper = function (paper) {
        $scope.paper = paper;
        $scope.paperURL = `/api/laureate/${$scope.laureate.normalizedName}/paper/${paper.Id}`
      }
    },
  ]);
