EWD.application = {
  name: 'ewdGDSync',
  labels: {
    'ewd-title': 'EWD.js Google Drive Synchroniser',
    'ewd-loginPanel-title': 'EWD.js Google Drive Synchroniser',
    'ewd-navbar-title-phone': 'Google Drive Sync',
    'ewd-navbar-title-other': 'EWD.js Google Drive Synchroniser',
    //'ewd-menu-title': 'Menu',
    //'ewd-panel1-title': '[main panel header title if !selectPatient]'
  },
  menuOptions: [
    {
      text: 'Option 1',
      handler: function() {
        console.log("Handler for menu option when clicked");
      },
      active: true // leave out for other options
    }
  ],
  messageHandlers: function(messageObj) {
    // your application-specific websocket message handlers
    if (messageObj.type === 'authorise') {
      var url = messageObj.content.url;
      console.log('opening window for ' + url);
      EWD.application.authWindow = window.open(url, 'authWin', 'left=200,top=200,width=700,height=300');
    }
    if (messageObj.type === 'googleAuthentication') {
      if (messageObj.ok) {
        EWD.sockets.sendMessage({
          type: 'getEWDjsApps'
        });
      }
    }
    if (messageObj.type === 'ewdAppList') {
      //console.log('display the folders');
      EWD.application.tree.treeDataSource = new EWD.application.tree.DataSource({
        data: messageObj.content.results,
        delay: 400
      });
      $('#ewdAppList').tree({dataSource: EWD.application.tree.treeDataSource});
      $('#wait').hide();
      $('.folderTitle').show();
    }
    if (messageObj.type === 'ewdAppFolders') {
      EWD.application.tree.callback({data: messageObj.content.results});
    }
    if (messageObj.type === 'ewdAppFiles') {
      EWD.application.tree.callback({data: messageObj.content.results});
    }
    if (messageObj.type === 'info') {
      $('#info').append('<div>' + messageObj.content.message + '</div>');
      if ($('#info').length > 0){
        $('#info')[0].scrollTop = $('#info')[0].scrollHeight;
      }
    }
    if (messageObj.type === 'downloadComplete') {
      $('#action').text(EWD.application.googleFile.name + ': local copy updated');
    }
  }

};

EWD.sockets.log = true;

// FuelUX Tree


EWD.application.tree = {};

EWD.application.tree.DataSource = function (options) {
  this._formatter = options.formatter;
  this._columns = options.columns;
  this._data = options.data;
};

EWD.application.tree.DataSource.prototype = {
  columns: function () {
    return this._columns;
  },

  data: function (options, callback) {
    if (jQuery.isEmptyObject(options)) {
      // load up the tree
      callback({data: this._data});
    }
    else {
      // fetch sub-items
      console.log('options: ' + JSON.stringify(options, null, 2));
      EWD.application.tree.callback = callback;
      var type;
      var appName;
      var folder;
      if (options.subtype === 'appName') {
        type = 'getEWDjsAppFolders';
        appName = options.name;
        folder = '';
      }
      if (options.subtype === 'appFolder') {
        type = 'getEWDjsAppFiles';
        appName = options.appName;
        folder = options.name;
      }
      EWD.sockets.sendMessage({
        type: type,
        params: {
          id: options.id,
          appName: appName,
          folder: folder
        }
      });
    }
  }
};


$('#ewdAppList').on('selected', function (evt, data) {
  EWD.application.googleFile = data.info[0];
  $('#actionPanel').show();
  var filename = data.info[0].name;
  $('#action').text(filename);
  EWD.sockets.sendMessage({
    type: 'checkLocalStatus',
    params: {
      filename: EWD.application.googleFile.name,
      appName: EWD.application.googleFile.appName,
      folder: EWD.application.googleFile.folder,
      href: window.location.href
    }
  });
});  

$('#downloadBtn').on('click', function () {
  console.log("Download!....");
  $('#action').text('Downloading ' + EWD.application.googleFile.name + "....");
  EWD.sockets.sendMessage({
    type: 'downloadFile',
    params: {
      url: EWD.application.googleFile.downloadUrl,
      filename: EWD.application.googleFile.name,
      appName: EWD.application.googleFile.appName,
      folder: EWD.application.googleFile.folder,
      href: window.location.href
    }
  });
}); 

$(function(){
  $("#downloadBtn").tooltip({
    title: "Update local copy with version on Google Drive"
  });
});







