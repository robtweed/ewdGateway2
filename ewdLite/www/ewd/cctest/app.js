EWD.sockets.log = true;   // *** set this to false after testing / development

EWD.application = {
  name: 'cctest',
  timeout: 3600,
  chromecast: true,
  login: false,
  labels: {
    'ewd-title': 'Demo',                                     // *** Change as needed
    'ewd-navbar-title-phone': 'Demo App',                    // *** Change as needed
    'ewd-navbar-title-other': 'Demonstration Application'    // *** Change as needed
  },
  navFragments: {
    main: {
      cache: true
    },
    about: {
      cache: true
    }
  },
  contentLoaded: false,

  onStartup: function() {
    EWD.getFragment('navlist.html', 'navList');
    EWD.getFragment('main.html', 'main_Container');
    console.log('started');
  },

  onPageSwap: {
    // add handlers that fire after pages are swapped via top nav menu
    /* eg:
    about: function() {
      console.log('"about" menu was selected');
    }
    */
  },

  onFragment: {
    // add handlers that fire after fragment contents are loaded into browser

    'navlist.html': function(messageObj) {
      EWD.bootstrap3.nav.enable();
    }
  },

  onMessage: {

    // add handlers that fire after JSON WebSocket messages are received from back-end

    loggedIn: function(messageObj) {
      toastr.options.target = 'body';
      $('#main_Container').show();
      $('#mainPageTitle').text('Welcome to VistA, ' + messageObj.message.name);
    }
  }

};

EWD.chromecast = {
  onMessage: {
    about: function(obj) {
      var msg = obj.message;
      var senderId = obj.senderId;
      $('#about_Nav').click();
      EWD.chromecast.sendMessage({
        type: 'aboutReceived',
        message: 'Yes I received the request to switch to the about panel'
      });
    },
    main: function(obj) {
      $('#main_Nav').click();
    },
    down: function(obj) {
      $('#pointer').animate({
        top: "+=50"
      }, 100, function() {
        // Animation complete.
      });
    },
    up: function(obj) {
      $('#pointer').animate({
        top: "-=50"
      }, 100, function() {
        // Animation complete.
      });
    },
     left: function(obj) {
      $('#pointer').animate({
        left: "-=50"
      }, 100, function() {
        // Animation complete.
      });
    },
    right: function(obj) {
      $('#pointer').animate({
        left: "+=50"
      }, 100, function() {
        // Animation complete.
      });
    },
    pointerPosition: function(obj) {
      $('#pointer').css({
        left: obj.message.x,
        top: obj.message.y
      });
    }
  }
};





