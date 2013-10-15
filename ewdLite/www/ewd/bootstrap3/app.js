EWD.application = {
  name: '[your appName]',
  labels: {
    'ewd-title': '[<title> name in HTML Header]',
    'ewd-loginPanel-title': '[Title for modal login panel]',
    'ewd-navbar-title-phone': '[Title in top header bar - shortened for phone]',
    'ewd-navbar-title-other': '[Title in top header bar for use in other devices]',
    'ewd-menu-title': '[Header for main menu side panel]',
    'ewd-panel1-title': '[main panel header title if !selectPatient]'
  },
  menuOptions: {
    'yourMenuOptionId': {
      text: '[Menu Option Text]',
      handler: function() {
        console.log("Handler for menu option when clicked");
      },
      active: true // leave out for other options
    }
  },
  selectPatient: true,  // set to false if you don't want patient selection enabled
  tabbedPanels: false,  // set to true to enable multiple tabbed panels
  messageHandlers: function(messageObj) {
    // your application-specific websocket message handlers
  }
};



