    var max = 200;
    var noOfLines = 0;
    var scrollNo = 0;
    var rowByPid = {};
    var timeSlotNo = 0;
    var maxSlots = 60;
    var logging = {
      level: 0,
      interval: 30,
      to: 'console'
    };

    var addLine = function(text) {
      var parentObj = document.getElementById('consoleText');
      var divObj = document.createElement('div');
      var textObj = document.createTextNode(text);
      divObj.appendChild(textObj);
      parentObj.appendChild(divObj);
      if (noOfLines < max) {
        noOfLines++;
      }
      else {
        parentObj.removeChild(parentObj.firstChild);
      }
      scrollNo++;
      scrollToEnd();
      text = null;
      parentObj = null;
      divObj = null;
      textObj = null;
    };

    EWD.sockets.serverMessageHandler = function(messageObj) {
      //console.log("serverMessageHandler: messageObj = " + JSON.stringify(messageObj));
      var i;
      var pidObj;
      var pid;

      var resetProcessGrid = function(pid) {
        //console.log("resetProcessGrid: pid = " + pid);
        setTimeout(function() {
          //console.log("setTimeout: pid = " + pid);
          var row = rowByPid[pid];
          //console.log("row = " + row);
          childProcesses.removeAt(row);
          rowByPid = {};
          var xpid;
          for (row = 0; row < childProcesses.getCount(); row++) {
            xpid = childProcesses.getAt(row).get('pid');
            rowByPid[xpid] = row;
          }
          //console.log("rowByPid: " + JSON.stringify(rowByPid));
        },5);
      };
      if (messageObj.type === 'consoleText') {
        if (EWD.sockets.log) console.log("message received: " + JSON.stringify(messageObj));
        addLine(messageObj.text);
        messageObj = null;
        return;
      }
      if (messageObj.type === 'reloadModule') {
        Ext.Msg.alert('Reload Module', messageObj.message);
        closeMsg();
      }
      if (messageObj.type === 'systemInfo') {
        buildStore.getAt(3).set('version',messageObj.json.ewdBuild);
        buildStore.getAt(4).set('version',messageObj.json.zv);
        messageObj = null;
        return;
      }
      if (messageObj.type === 'processInfo') {
        buildStore.getAt(0).set('version',messageObj.data.nodeVersion);
        buildStore.getAt(1).set('version',messageObj.data.build);
        buildStore.getAt(2).set('version',messageObj.data['ewdQBuild']);
        Ext.getCmp('qGrid').setTitle('Master Process: ' + messageObj.data.masterProcess);

        childProcesses.removeAt(0);
        for (i = 0; i < messageObj.data.childProcesses.length; i++) {
          pidObj = messageObj.data.childProcesses[i];
          childProcesses.add({pid: pidObj.pid, noOfRequests: pidObj.noOfRequests, available: pidObj.available});
          rowByPid[pidObj.pid] = i;
        }
        logging.interval = +messageObj.data.interval/1000;
        logging.level = +messageObj.data.traceLevel;
        logging.to = messageObj.data.logTo;
        Ext.getCmp('loggingLevel').setValue({level: logging.level});
        Ext.getCmp('logToGroup').setValue({logTo: logging.to});
        Ext.getCmp('logFilePath').setValue(messageObj.data.logFile);
        messageObj = null;
        return;
      }
      if (messageObj.type === 'registerModule') {
        //console.log("response received from registerModule: " + JSON.stringify(messageObj));
        messageObj = null;
        return;
      }
      if (messageObj.type === 'workerProcess') {
        if (messageObj.action === 'add') {
          rowByPid[messageObj.pid] = childProcesses.getCount();
          childProcesses.add({pid: messageObj.pid, noOfRequests: 0, available: true});
        }
        if (messageObj.action === 'remove') {
          if (childProcesses.getCount() === 1) {
            Ext.Msg.alert('Error', 'ewdGateway2 requires at least 1 worker process');
          }
          else {
            pid = messageObj.pid;
            var row = rowByPid[pid];
            if (typeof row !== 'undefined') {
              var record = childProcesses.getAt(row);
              var no = record.get('noOfRequests');
              record.set('noOfRequests', '* ' + no);
            }
            resetProcessGrid(pid);
          }
        }
        messageObj = null;
        return;
      }
      if (messageObj.type === 'pidUpdate') {
        pid = messageObj.pid;
        var row = rowByPid[pid];
        if (typeof row !== 'undefined') {
          var record = childProcesses.getAt(row);
           record.set({noOfRequests: messageObj.noOfRequests, available: messageObj.available});
        }
        messageObj = null;
        return;
      }
      if (messageObj.type === 'queueInfo') {
        var rec = queueStore.getAt(0);
        rec.set('length', messageObj.qLength);
        var max = rec.get('max');
        if (messageObj.qLength > max) rec.set('max', messageObj.qLength);
        messageObj = null;
        return;
      }
      if (messageObj.type === 'getSessionData') {
        Ext.getCmp('sessionTree').destroy();
        var store = Ext.create('Ext.data.TreeStore', convertToTreeStore(messageObj.message));
        var treePanel = Ext.create('Ext.tree.Panel', {
          title: 'Session: ' + messageObj.message['ewd_sessid'],
          store: store,
          id: 'sessionTree'
        });
        Ext.getCmp('sessionTreePanel').add(treePanel);
        var height = Ext.getCmp('sessionPanel').getHeight();
        treePanel.setHeight(height - 5);
        messageObj = null;
        return;
      }
      if (messageObj.type === 'newSession') {
        //console.log("New session!: " + JSON.stringify(messageObj));
        EWD.sockets.sendMessage({type: "getNewSession", handlerModule: 'ewdGW2Mgr', handlerFunction: 'webSocketHandler', params: {sessid: messageObj.json.sessid}});
        messageObj = null;
        return;        
      }
      if (messageObj.type === 'getNewSession') {
        //console.log("New session row: " + JSON.stringify(messageObj));
        sessionGridStore.add(messageObj.message);
        messageObj = null;
        return;        
      }
      if (messageObj.type === 'deleteSession') {
        //console.log("Deleted session: " + JSON.stringify(messageObj));
        var index = sessionGridStore.find('sessid', messageObj.json.sessid);
        sessionGridStore.removeAt(index);
        messageObj = null;
        return;        
      }
      if (messageObj.type === 'updateSessionGrid') {
        //console.log("Update session grid: " + JSON.stringify(messageObj));
        var sessid;
        for (sessid in messageObj.message) {
          var index = sessionGridStore.find('sessid', sessid);
          sessionGridStore.getAt(index).set('expiry', messageObj.message[sessid].expiry);
        }
        var height = Ext.getCmp('sessionPanel').getHeight();
        if (height > 20) Ext.getCmp('sessionGrid').setHeight(height - 5);
        messageObj = null;
        return;        
      }
      if (messageObj.type === 'memory') {
        if (typeof memoryHistory !== 'undefined') {
          timeSlotNo++;
          if (timeSlotNo > maxSlots) {
            memoryHistory.removeAt(0);
            var chart = Ext.getCmp('memoryChart');
            var axis = chart.axes.get(1);
            axis.minimum++;
            axis.maximum++;
          }
          memoryHistory.add({rss: +messageObj.rss, heapTotal: +messageObj.heapTotal, heapUsed: +messageObj.heapUsed, timeslot: timeSlotNo});
          Ext.getCmp('interval').setValue(+messageObj.interval/1000);
          messageObj = null;
          return;
        }
      }
    };

    var scrollToEnd = function() {
      var myNo = +scrollNo;
      setTimeout(function() {
        if (myNo === scrollNo) {
          var panel = Ext.getCmp('console').body.dom;
          panel.scrollTop = panel.scrollHeight - panel.offsetHeight;
          panel = null;
        }
      }, 500);
    };

    var devToolsLogging = function(button) {
      EWD.sockets.log = !EWD.sockets.log;
      if (EWD.sockets.log) {
        button.setText("Console Logging Off");
      }
      else {
        button.setText("Console Logging On");
      }
    };

    var updateMemoryGrid = function(storeItem, item) {
      this.setTitle('Time sample ' + storeItem.get('timeslot'));
      memoryGridStore.getAt(0).set('mb',storeItem.get('rss'));
      memoryGridStore.getAt(1).set('mb',storeItem.get('heapTotal'));
      memoryGridStore.getAt(2).set('mb',storeItem.get('heapUsed'));
    }; 

    var chartTip1 = {
      trackMouse: true,
      width: 220,
      height: 170,
      layout: 'fit',
      listeners: {
        show: function(me) {
          me.add(Ext.getCmp('memoryGrid'));
        },
        hide: function(me) {
          me.remove(Ext.getCmp('memoryGrid'), false);
        }
      },
      renderer: updateMemoryGrid 
    };

    var chartTip2 = {
      trackMouse: true,
      width: 220,
      height: 170,
      layout: 'fit',
      listeners: {
        show: function(me) {
          me.add(Ext.getCmp('memoryGrid'));
        },
        hide: function(me) {
          me.remove(Ext.getCmp('memoryGrid'), false);
        }
      },
      renderer: updateMemoryGrid
    };

    var chartTip3 = {
      trackMouse: true,
      width: 220,
      height: 170,
      layout: 'fit',
      listeners: {
        show: function(me) {
          me.add(Ext.getCmp('memoryGrid'));
        },
        hide: function(me) {
          me.remove(Ext.getCmp('memoryGrid'), false);
        }
      },
      renderer: updateMemoryGrid
    };

    var workerProcess = function(action) {
      EWD.sockets.sendMessage({type: "workerProcess", action:  action, password: ewdGateway2Password});
    };    

    var setMonitorLevel = function(value) {
      EWD.sockets.sendMessage({type: 'setParameter', name: 'monitorLevel', value: value, password: ewdGateway2Password});
    };

    var setLogTo = function(value) {
      EWD.sockets.sendMessage({type: 'setParameter', name: 'logTo', value: value, password: ewdGateway2Password});
      if (value === 'console') {
        Ext.getCmp('logFileOptionBtn').hide();
        Ext.getCmp('logFilePath').setDisabled(true);
      }
      if (value === 'file') {
        Ext.getCmp('logFileOptionBtn').show();
        Ext.getCmp('logFilePath').setDisabled(false);
      }
    };

    var closeMsg = function() {
      Ext.defer(function() {
        Ext.MessageBox.hide();
      },1500);
    };

    var clearLogFile = function() {
      EWD.sockets.sendMessage({type: 'setParameter', name: 'clearLogFile', password: ewdGateway2Password});
      Ext.Msg.alert('Information', 'Log file has been cleared'); 
      closeMsg();
    };

    var changeLogFile = function() {
      var path = Ext.getCmp('logFilePath').getValue();
      EWD.sockets.sendMessage({type: 'setParameter', name: 'changeLogFile', value: path, password: ewdGateway2Password});
      Ext.Msg.alert('Information', 'Log file path changed to ' + path); 
      closeMsg();
    };

    var startConsole = function() {
      EWD.sockets.sendMessage({type: "startConsole", message:  "start", password: ewdGateway2Password});
      EWD.sockets.sendMessage({type: "systemInfo", message:  "now", password: ewdGateway2Password});
    };   

    var moduleHandler = function(record) {
      /*
      if (record.data.depth === 2) {
        // application intermediate node
        var appName = record.data.text;
        var appNameField = Ext.getCmp('moduleAppName');
        appNameField.setValue(appName); 
        appNameField.setReadOnly(true);
        var nameField = Ext.getCmp('moduleName');
        nameField.setValue('');
        nameField.setReadOnly(false); 
        var pathField = Ext.getCmp('modulePath');
        pathField.setValue('');     
        Ext.getCmp('moduleWindow').show();
        Ext.getCmp('registerModuleBtn').show();
        Ext.getCmp('moduleBtnGroup').hide();
      }
      */
      if (record.data.leaf) {
        var arr = record.raw.nvp.split('^');
        var appNameField = Ext.getCmp('moduleAppName');
        appNameField.setValue(arr[0]); 
        appNameField.setReadOnly(true);    
        var nameField = Ext.getCmp('moduleName');
        nameField.setValue(arr[1]); 
        nameField.setReadOnly(true);    
        var pathField = Ext.getCmp('modulePath');
        pathField.setValue(arr[2]); 
        pathField.setReadOnly(true);  
        Ext.getCmp('moduleWindow').show();
        //Ext.getCmp('registerModuleBtn').hide();
        Ext.getCmp('moduleBtnGroup').show();
      }
    };

    var getSessionData = function(sessid) {
      EWD.sockets.sendMessage({type: 'getSessionData', handlerModule: 'ewdGW2Mgr', handlerFunction: 'webSocketHandler', params: {sessid: sessid}});
    };

    var closeSession = function(sessid) {
      EWD.sockets.sendMessage({type: 'closeSession', handlerModule: 'ewdGW2Mgr', handlerFunction: 'webSocketHandler', params: {sessid: sessid}});
    };

    var reloadModule = function() {
      var appName = Ext.getCmp('moduleAppName').getValue();  
      var moduleName = Ext.getCmp('moduleName').getValue();   
      Ext.getCmp('moduleWindow').close();
      EWD.sockets.sendMessage({type: "reloadModule", handlerModule: 'ewdGW2Mgr', handlerFunction: 'webSocketHandler', params: {appName:  appName, moduleName: moduleName}});
    };

    var exitNode = function() {
      Ext.Msg.confirm('Attention!', 'Are you sure you really want to shut down the Node.js ewdGateway2 process?', function(button) {
        if (button === 'yes') {
          EWD.sockets.sendMessage({type: "exit", password: ewdGateway2Password});
          Ext.Msg.alert('Information', 'The ewdGateway2 Node.js process has been closed down'); 
          closeMsg();
        }
      });

    };

    EWD.sockets.keepAlive(10);

    var timedUpdate = function() {
      setTimeout(function() {
        EWD.sockets.sendMessage({type: "updateSessionGrid", handlerModule: 'ewdGW2Mgr', handlerFunction: 'webSocketHandler'});
        timedUpdate();
      },60000);
    };

    var setSessionGridHeight = function() {
      setTimeout(function() {
        var height = Ext.getCmp('sessionPanel').getHeight();
        Ext.getCmp('sessionGrid').setHeight(height - 5);
      },500);
    };

    /*
    var registerModule = function(button) {
        var appName = Ext.getCmp('moduleAppName').getValue();  
        var moduleName = Ext.getCmp('moduleName').getValue();   
        var path = Ext.getCmp('modulePath').getValue();
      if (moduleName === '') {
        Ext.Msg.alert('Error', 'You must enter a Module Name');
        return;
      }
      if (path === '') {
        Ext.Msg.alert('Error', 'You must enter a Module Path');
        return;
      }
      Ext.getCmp('moduleWindow').hide();
      EWD.sockets.sendMessage({type: "registerModule", handlerModule: 'ewdGW2Mgr', handlerFunction: 'webSocketHandler', params: {appName:  appName, moduleName: moduleName, path: path}});
    };
    */

    var convertToTreeStore = function(obj) {
      var store = {
        root:{
          text: 'Session Data',
          expanded: true,
        }
      };
      store.root.children = convertLevel(obj);
      //console.log(JSON.stringify(store));
      return store;
    }

    var convertLevel = function(obj) {
      var children = [];
      var i;
      var j;
      var n = -1;
      for (i in obj){
        n++;
        if (obj[i] instanceof Object && !(obj[i] instanceof Array)) {
          children[n] = {
            text: i, 
            children: convertLevel(obj[i])
          }
        }
        else if (obj[i] instanceof Array) {
          children[n] = {
            text: i,
            children: []
          };
          for (j = 0; j < obj[i].length; j++) {
            children[n].children[j] = convertLevel(obj[i][j]);
          }
        }
        else {
          children[n] = {text: i + ': ' + obj[i], leaf: true};
        }
      }
      return children;
    };



