EWD.bootstrap3 = {
  createMenu: function() {
    if (document.getElementById('ewd-mainMenu') && !EWD.application.menuCreated) {
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
      document.getElementById('username').focus();
    },1000);
  });
  $('#loginPanel').modal({show: true, backdrop: 'static'});

  $('#loginForm').keydown(function(event){
    if (event.keyCode === 13) {
      document.getElementById('loginBtn').click();
    }
  });

  $('#newPatient').click(function(e) {
    e.preventDefault();
    $('#patientSelectionForm').modal('show');
    $('#patientSelectionFormBody').css("overflow-y","visible");
    if (EWD.application.topPanelActivated) $('#topPanel').collapse('hide');
  });

  $('#patientSelectionForm').on('hide.bs.modal', function() {
    if (EWD.application.topPanelActivated) {
      $('#topPanel').collapse('show');
    }
  });

  // select2 handler that fires on each keystroke in the Select Patient panel

  $("#selectedPatient").select2({
    minimumInputLength: 1,
    query: function (query) {
      EWD.application.select2 = {
        callback: query.callback,
      };
      EWD.sockets.sendMessage({
        type: 'patientQuery',
        params: {
          prefix: query.term
        }
      });
    }
  });

  // Login form button handler

  $('body').on( 'click', '#loginBtn', function(event) {
    event.stopPropagation(); // prevent default bootstrap behavior
    EWD.sockets.submitForm({
      fields: {
        username: $('#username').val(),
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
      $('#topPanel').collapse('show');
      EWD.application.topPanelActivated = true;
      EWD.bootstrap3.createMenu();
    }
    return;
  }

  if (messageObj.type === 'loggedInAs') {
    // update 'logged in as ' banner in header
    document.getElementById('ewd-loggedInAs').innerHTML = messageObj.message.fullName;
    return;
  }

  if (messageObj.type === 'patientMatches') {
    // update patient lookup combo with matching names
    EWD.application.select2.results = messageObj.params;
    EWD.application.select2.callback(EWD.application.select2);
    return;
  }

  if (messageObj.type === 'patientSelected') {
    // patient selected: remove combo and show patient panel
    $('#topPanel').collapse('show');
    $('#patientSelectionForm').modal('hide');
    EWD.application.topPanelActivated = true;
    document.getElementById('ewd-panel1-title').innerHTML = messageObj.message.patientName;
    EWD.bootstrap3.createMenu();
    return;
  }

  if (EWD.application.messageHandlers) EWD.application.messageHandlers(messageObj);

};

$(document).ready(function() {
  EWD.isReady();
});



