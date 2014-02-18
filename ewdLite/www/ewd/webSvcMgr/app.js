EWD.application = {
  name: 'webSvcMgr',
  login: true,
  labels: {
    'ewd-title': 'EWD.js Web Service Manager',
    'ewd-loginPanel-title': 'EWD.js Web Service Manager',
    'ewd-navbar-title-phone': 'EWD.js Web Service Manager',
    'ewd-navbar-title-other': 'EWD.js Web Service Manager',
    'ewd-menu-title': 'Menu',
    'ewd-panel1-title': 'Add User',
    'ewd-panel2-title': 'Manage Users',
    'ewd-panel3-title': 'Edit User'
  },
  menuOptions: [
    {
        text: 'Manage Users',
        handler: function() {
            EWD.wsManage.panelSwap("manageUsersPanel");
            if (EWD.wsManage.usersLoaded === false) {
                EWD.wsManage.getUsers();
            }
        },
        active: false // leave out for other options
    },
    {
        text: 'Add Users',
        handler: function() {
            EWD.wsManage.clearInputs();
            EWD.wsManage.panelSwap("addUsersPanel");
        },
        active: true
    }
  ],

  messageHandlers: function(messageObj) {
    
    if (messageObj.type === 'getUsers') {
        EWD.wsManage.users = messageObj.message;
        EWD.wsManage.buildUserList();
        EWD.wsManage.usersLoaded = true;
    }
    
    if (messageObj.type === 'deleteUser') {
        var deletedId = "#user_" + EWD.wsManage.selectedUser;
        var appsLength = $("#appList").children().length;
        var keysLength = $("#secretKeyList").children().length;
        $(deletedId).remove();
        EWD.wsManage.clearList("appList", appsLength);
        EWD.wsManage.clearList("secretKeyList", keysLength);
        if (messageObj.message !== true) {
            toastr.success("User Deleted");
            EWD.wsManage.selectedUser = "";
        }
        else {
            EWD.wsManage.selectedUser = $("#edit_accessIdInput").val();
        }
        console.log("deleted");
        console.log(messageObj.message);
    }
    
    if (messageObj.type === 'saveUser') {
        toastr.success(messageObj.message);
        console.log(messageObj);
        if (messageObj.message === "User Edited!") {
            console.log("saved, now refreshing lists")
            EWD.wsManage.panelSwap("manageUsersPanel");
            //EWD.wsManage.refreshUsers();
        }
        // refresh & swap
    }

    if (messageObj.type === 'EWD.form.login') {
        // logged in OK - hide login panel
        if (messageObj.ok) $('#loginPanel').modal('hide');
        if (!EWD.application.selectPatient) {
          $('#contentContainer').collapse('show');
          EWD.application.topPanelActivated = true;
          EWD.bootstrap3.createMenu();
          EWD.wsManage.onLogin();
        }
        return;
    }

    if (messageObj.type === 'loggedInAs') {
        // update 'logged in as ' banner in header
        document.getElementById('ewd-loggedInAs').innerHTML = messageObj.message.fullName;
        return;
    }
  }
};

EWD.wsManage = {
    usersLoaded: false,
    panels: [
        "addUsersPanel",
        "manageUsersPanel",
        "editUsersPanel"
    ],
    appCount: 1,
    newApphtml: "<div class='input-group'>                                              \
                    <input type='text' class='form-control' id='appNameInput_new'>      \
                    <span class='input-group-btn' id='appNameDel_new'>                  \
                        <button class='btn btn-default'>                                \
                        <span class='glyphicon glyphicon-remove'>                       \
                        </span>                                                         \
                        </button>                                                       \
                    </span>                                                             \
                </div>",
                
    newAppId: "appNameInput_new",
    selectedUser: "",
    
    /*
        * sets listeners
    */
    listeners: function() {
        $("#extraApp").on('click', EWD.wsManage.extraApp);
        $("#edit_extraApp").on('click', {isEdit: true} ,EWD.wsManage.extraApp);
        $("#saveUser").on('click', EWD.wsManage.saveUser);
        $("#edit_saveUser").on('click', {isEdit: true} ,EWD.wsManage.saveUser);
        $("#refreshUserList").on('click', EWD.wsManage.refreshUsers);
        $("#editUser").on('click', EWD.wsManage.editUser);
        $("#deleteUser").on('click', EWD.wsManage.deleteUser);
        $("#del_edit_appNameInput0").on('click', function() {
            var outer = $(this).parent().parent();
            var ID = "edit_appNameInput";
            if (outer.children().length !== 2) {
                $(this).parent().remove();
                EWD.wsManage.appCount--;
                for (var i = 1; i < outer.children().length; i++) {
                    outer.children()[i].children[0].id = ID + (i - 1);
                    outer.children()[i].children[0].placeholder = "Application Name " + i;
                    outer.children()[i].children[1].id = "del_" + ID + (i - 1);
                }   
            }  
            else {
                toastr.error("You must assign at least 1 application");
            }
        });
        $("#addApp").on('click', EWD.wsManage.extraApp);
        $("#edit_back").on('click', function() {
            EWD.wsManage.panelSwap("manageUsersPanel");
            EWD.wsManage.selectedUser = "";
            if (EWD.wsManage.usersLoaded === false) {
                EWD.wsManage.getUsers();
            }
            //EWD.wsManage.refreshUsers();
            $("#menu-0").addClass("active");
        });
    },
    
    /*
        * runs on successful login
    */
    onLogin: function() {
        EWD.wsManage.listeners();
        toastr.options.target = "#contentContainer";
    },
    
    /*
        * swaps panels using DIV id's
        * @target {string} panelID 
    */
    panelSwap: function(target) { 
        if (target === "manageUsersPanel") {
            EWD.wsManage.refreshUsers();
        }
        $("#user_" + EWD.wsManage.selectedUser).removeClass("active");
        if ($("#secretKeyList").children().length > 1) {
            $("#secretKeyList").children()[1].remove();
        }
        var appListLength = $("#appList").children().length;
        for (var i = 1; i < appListLength; i++) {
            console.log($("#appList").children()[i]);
            $("#appList").children()[1].remove();
        }
        EWD.wsManage.selectedUser = "";
        EWD.wsManage.clearExtraApps();
        for (var i = 0; i < EWD.wsManage.panels.length; i++) {
            if (EWD.wsManage.panels[i] !== target) {
                $("#" + EWD.wsManage.panels[i]).hide();
            }
        }
        $("#" + target).show();
    },
    
    /*
        * retrieves users from global
    */
    getUsers: function() {
        EWD.sockets.sendMessage({
            type: "getUsers"
        });
    },
    
    clearList: function(listID, length) {
        if (length > 1) {
            for (var i = 1; i < length; i++) {
                $("#" + listID).children()[1].remove();
            }
        }
    },
    
    refreshUsers: function() {
        var accessLength = $("#accessIdList").children().length;
        var keysLength = $("#secretKeyList").children().length;
        var appsLength = $("#appList").children().length;
        EWD.wsManage.clearList("accessIdList", accessLength);
        EWD.wsManage.clearList("secretKeyList", keysLength);
        EWD.wsManage.clearList("appList", appsLength);
        EWD.wsManage.getUsers();
        EWD.wsManage.usersLoaded = true;
    },
    
    userInfo: function(eventObj) {
        var key = eventObj.data.key; 
        var apps = eventObj.data.apps;
        var buildKeyList = function() {
            var oldkeys = $("#secretKeyList").children().length;
            for (var i = 1; i < oldkeys; i++) {
                $("#secretKeyList").children()[1].remove();
            };
            var html = "<li class='list-group-item' id='newKey' data-keylist></li>";
            $("#secretKeyList").append(html);
            $("#newKey").text(key);
            $("#newKey").attr("id", "key_" + key);
        };
        var buildAppsList = function() {
            var oldapps = $("#appList").children().length;
            for (var i = 1; i < oldapps; i++) {
                $("#appList").children()[1].remove();
            };
            var html = "<li class='list-group-item' id='newApp' data-applist></li>"
            for (var i in apps) {
                $("#appList").append(html);
                $("#newApp").text(i);
                $("#newApp").attr("id", "app_" + i);
            }
        };
        $("[data-userlist]").each( function() {
            if ($(this).hasClass("active") === true) {
                $(this).removeClass("active");
            }
        });
        $(this).addClass("active");
        if ($("#secretKeyListHeader").is(":hidden") === true) {
            $("#secretKeyListHeader").show();
        }
        if ($("#appListHeader").is(":hidden") === true) {
            $("#appListHeader").show();
        }
        buildKeyList();
        buildAppsList();

    },
    
    editUser: function() {
        if (EWD.wsManage.selectedUser === "") {
            alert("No User Selected!");
            return;
        }
        var outer = $("edit_appInputs");
        for (var i = 1; i < outer.children().length; i++) {
            console.log("running for");
            console.log(delID);
            outer.children()[i].children[0].id = ID + (i - 1);
            outer.children()[i].children[0].placeholder = "Application Name " + i;
        }   
        /*
        if ($("#del_edit_appNameInput0").length === 0) {
            var html = "                                                                                                    \
                <div class='input-group' id='edit_appInputList'>                                                            \
                    <input type='text' class='form-control' id='edit_appNameInput0' placeholder='Application Name 1'>       \
                    <span class='input-group-btn' id='del_edit_appNameInput0'>                                              \
                        <button class='btn btn-default'>X</button>                                                          \
                    </span>                                                                                                 \
                </div>";
            $("#edit_appInputs").append(html);
        }
        */
        EWD.wsManage.appCount = 0;
        var accessID = EWD.wsManage.selectedUser;
        var userObj = EWD.wsManage.users[accessID];
        var j = 0;
        $("#menu-0").removeClass("active");
        $("#manageUsersPanel").hide();
        $("#editUsersPanel").show();
        $("#edit_accessIdInput").val(accessID);
        $("#edit_secretKeyInput").val(EWD.wsManage.users[accessID].secretKey);
        for (var i in userObj.apps) {
            console.log("i = " + i);
            console.log("j = " + j);
            if (j !== 0) {
                EWD.wsManage.extraApp(true);
            }
            $("#edit_appNameInput" + j).val(i);
            j++;
        }
    },
    
    users: {},
    
    buildUserList: function() {
        var html = "<li class='list-group-item' id='newuser' data-userlist></li>"
        var key;
        var apps = [];
        var users = EWD.wsManage.users;
        for (var id in users) {
            key = users[id].secretKey;
            apps = users[id].apps;
            $("#accessIdList").append(html);
            $("#newuser").text(id);
            $("#newuser").attr("id", "user_" + id);
            $("#user_" + id).on('click', { id:id, key:key, apps:apps }, EWD.wsManage.userInfo);
            $("#user_" + id).on('mouseover', EWD.wsManage.listOver);
            $("#user_" + id).on('mouseout', EWD.wsManage.listOut);
            $("#user_" + id).on('click', EWD.wsManage.listClick);
        };
    },
    
    listOver: function() {
        if ($(this).hasClass("active") === false) {
            $(this).css({"background-color": "#9f9f9f", "cursor":"pointer"});
        }
    },
    listOut: function() {
        $(this).css({"background-color": ""});
    },
    listClick: function() {
        $(this).css({"background-color": ""});
        var id = $(this).attr("id");
        var idChars = id.length;
        var user = id.substring(5, idChars);
        EWD.wsManage.selectedUser = user;
    },
    
    /*
        * Adds an extra application name input box
    */
    extraApp: function(edit) {
        if (edit.data && edit.data.isEdit === true) {
            edit = true;
        }
        EWD.wsManage.appCount++;
        var count = EWD.wsManage.appCount;
        var target = "#appInputs";
        var ID = "appNameInput";
        var delID = "del_appNameInput";
        if (edit === true) {
            target = "#edit_appInputs";
            ID = "edit_appNameInput";
            delID = "del_edit_appNameInput";
            count++;
        }
        $(target).append(EWD.wsManage.newApphtml);
        $("#appNameInput_new").attr("placeholder", "Application Name " + count);
        $("#appNameInput_new").attr("id", ID + (count - 1));
        $("#appNameDel_new").attr("id", delID + (count - 1));
        $("#" + delID + (count -1)).unbind();
        $("#" + delID + (count -1)).on('click', function() {
            var outer = $(this).parent().parent();
            if (outer.children().length !== 2) {
                $(this).parent().remove();
                EWD.wsManage.appCount--;
                for (var i = 1; i < outer.children().length; i++) {
                    console.log("running for");
                    console.log(delID);
                    outer.children()[i].children[0].id = ID + (i - 1);
                    outer.children()[i].children[0].placeholder = "Application Name " + i;
                    outer.children()[i].children[1].id = "del_" + ID + (i - 1);
                }   
            }
            else {
                toastr.error("You must assign at least 1 application");
            }
        });
    },
   
    removeApp: function() {
        
    },
    
    deleteUser: function(isEdit) {
        console.log("isEdit = ");
        console.log(isEdit);
        if (typeof isEdit !== "boolean") {
            isEdit = false;
            console.log("isEdit is not boolean, setting to false");
        }
        console.log("deleting user, isEdit = " + isEdit);
        if (EWD.wsManage.selectedUser !== "") {
            EWD.sockets.sendMessage({
                type: 'deleteUser',
                params: {
                    target: EWD.wsManage.selectedUser,
                    isEdit: isEdit
                }
            });
        }
        else {
            alert("select a user to delete");
        }
    },
    
    clearExtraApps: function() {
        EWD.wsManage.appCount = 1;
        var inputs = $("#appInputs").children().length;
        inputs = inputs -2;
        var editInputs = $("#edit_appInputs").children().length;
        editInputs = editInputs -2;
        for (var i = 0; i < inputs; i++) {
            $("#appInputs").children()[2].remove();
        }
        for (var j = 0; j < editInputs; j++) {
            $("#edit_appInputs").children()[2].remove();
        }
    },
    
    clearInputs: function() {
        $("#accessIdInput").val("");
        $("#secretKeyInput").val("");
        $("#appNameInput0").val("");
        $("#edit_accessIdInput").val("");
        $("#edit_secretKeyInput").val("");
        $("#edit_appNameInput0").val("");
    },
    
    saveUser: function(eventObj) {
        var validate = function(id,key,app) {
            var checks = function(id,key,app) {
                if (id === "" || id === " ") { 
                    return ["false", "ID must not be empty"];
                }
                if (key === "" || key === " ") { 
                    return ["false", "Key must not be empty"];
                }
                for (var i = 0; i < app.length; i++) {
                    if (app[i] === "" || app[i] === " ") { 
                        return ["false", "Application must not be empty"];
                    }
                }
                return ["true"];
            };
            var valid = checks(id,key,app);
            return valid;
        };
        
        var doSave = function(id, key, appNames, isEdit) {
            if (isEdit === true) {
                EWD.wsManage.deleteUser(isEdit);
            }
            var saveObj = {};
            var appNameObj = {};
            var accessID = id;
            var secretKey = key;
            for (var i in appNames) {
                appNameObj[appNames[i]] = true;
            }
            saveObj[accessID] = {
                    "secretKey": secretKey,
                    "apps": appNameObj
            };
            console.log(saveObj);
            console.log(saveObj);
            console.log("isEdit = " + isEdit);
            EWD.sockets.sendMessage({
                type: 'saveUser',
                params: {
                    obj: saveObj,
                    isEdit: isEdit
                }
            });
        };
        
        if (eventObj.data) {
            var isEdit = eventObj.data.isEdit;
        }
        else {
            var isEdit = false;
        }
        var idInputId = "#accessIdInput";
        var keyInputId = "#secretKeyInput";
        var appInputId = "#appInputs";
        var count = EWD.wsManage.appCount;
        console.log(isEdit);
        if (isEdit === true) {
            idInputId = "#edit_accessIdInput";
            keyInputId = "#edit_secretKeyInput";
            appInputId = "#edit_appInputs";
            count++;
        }
        console.log(idInputId + " " + keyInputId + " " + appInputId);
        var id = $(idInputId).val();
        var key = $(keyInputId).val();
        var appNames = [];
        var appName = "";
        for (var app = 1; app < (count+1); app++) {
            console.log(app);
            appName = $(appInputId).children()[app].children[0].value;
            appNames.push(appName);
        }
        console.log("appNames = " + JSON.stringify(appNames));
        var isValid = validate(id,key,appNames);
        if (isValid[0] === "true") {
            doSave(id, key, appNames, isEdit);
            EWD.wsManage.clearExtraApps();
            EWD.wsManage.clearInputs();
        }
        else {
            toastr.error(isValid[1]);
        }
    }, 
    
};


// EWDBS3 code
////////////////////////////////////////////////////////////////////////

EWD.bootstrap3 = {
  createMenu: function() {
    if (!EWD.application.menuCreated) {
      var option;
      var i;
      for (i = 0; i < EWD.application.menuOptions.length; i++) {
        option = EWD.application.menuOptions[i];
        var li = document.createElement('li');
        li.setAttribute('id', 'menu-' + i);
        if (option.active) {
          li.setAttribute('class', 'active ewd-menu');
          EWD.application.activeMenu = 'menu-' + i;
        }
        else {
          li.setAttribute('class', 'ewd-menu');
        }
        var a = document.createElement('a');
        a.setAttribute('href', '#');
        a.innerHTML = option.text;
        li.appendChild(a);
        document.getElementById('ewd-mainMenu').appendChild(li);
      }
      EWD.application.menuCreated = true;
    }
  }

};

EWD.onSocketsReady = function() {
  EWD.application.topPanelActivated = false;
  EWD.application.menuCreated = false;
  EWD.application.framework = 'bootstrap';

  if (EWD.application.selectPatient) {
    if (document.getElementById('newPatient')) {
      document.getElementById('newPatient').style.display = '';
    }
  }

  if (EWD.application.tabbedPanels) {
    if (document.getElementById('ewd-tabs')) {
      document.getElementById('ewd-tabs').style.display = '';
    }
  }

  for (id in EWD.application.labels) {
    document.getElementById(id).innerHTML = EWD.application.labels[id];
  }
  $('#loginPanel').on('show.bs.modal', function() {
    setTimeout(function() {
      document.getElementById('password').focus();
    },1000);
  });
  $('#loginPanel').modal({show: true, backdrop: 'static'});

  $('#loginForm').keydown(function(event){
    if (event.keyCode === 13) {
      document.getElementById('loginBtn').click();
    }
  });

  // Login form button handler

  $('body').on( 'click', '#loginBtn', function(event) {
    event.stopPropagation(); // prevent default bootstrap behavior
    EWD.sockets.submitForm({
      fields: {
        password: $('#password').val()
      },
      messageType: 'EWD.form.login',
      alertTitle: 'Login Error',
      toastr: {
        target: 'loginPanel'
      },
      popover: {
        buttonId: 'loginBtn',
        container: 'loginPanel',
        time: 2000
      }
    }); 
  });

  // Patient Selector Form button handler

  $('body').on( 'click', '#patientBtn', function(event) {
    event.stopPropagation(); // prevent default bootstrap behavior
    EWD.sockets.sendMessage({
      type: 'patientSelected',
      params: {
        patientId: $('#selectedPatient').select2('val')
      }
   });
  });

  // Menu handler

  $('body').on( 'click', '.ewd-menu', function(event) {
    event.stopPropagation();
    var id = event.currentTarget.id;
    $('#' + EWD.application.activeMenu).toggleClass("active", false);
    $('#' + id).toggleClass("active", true);
    EWD.application.activeMenu = id;
    var option = id.split('menu-')[1];
    EWD.application.menuOptions[option].handler();
  });

  if (toastr) {    
    toastr.options = {
      positionClass: "toast-top-right",
      showDuration: 300,
      hideDuration: 300,
      timeOut: 3000,
      showEasing: "linear",
      hideEasing: "swing",
      showMethod: "slideDown",
      hideMethod: "slideUp"
    };
  }
  else {
    $('#loginBtn').popover({
      title: 'Error',
      content: 'Testing',
      placement: 'top',
      container: '#loginPanel',
      trigger: 'manual'
    });
  }

  // everything is ready to go:
  // activate login button and the user can start interacting

  document.getElementById('loginBtn').style.display = '';
};

EWD.onSocketMessage = function(messageObj) {

  if (messageObj.type === 'EWD.form.login') {
    // logged in OK - hide login panel
    if (messageObj.ok) $('#loginPanel').modal('hide');
    if (!EWD.application.selectPatient) {
      $('#contentContainer').collapse('show');
      EWD.application.topPanelActivated = true;
      EWD.bootstrap3.createMenu();
      EWD.wsManage.onLogin();
    }
    return;
  }

  if (messageObj.type === 'loggedInAs') {
    // update 'logged in as ' banner in header
    //document.getElementById('ewd-loggedInAs').innerHTML = messageObj.message.fullName;
    return;
  }

  if (EWD.application.messageHandlers) EWD.application.messageHandlers(messageObj);

};

$(document).ready(function() {
  EWD.isReady();
});



