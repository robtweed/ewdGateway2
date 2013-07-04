var rowByPid = {};
var logging = {
  level: 0,
  interval: 30,
  to: 'console'
};
var max = 200;
var noOfLines = 0;
var scrollNo = 0;
var timeSlotNo = 0;
var maxSlots = 60;

var setMonitorLevel = function(value) {
  EWD.sockets.sendMessage({
    type: 'EWD.setParameter', 
	name: 'monitorLevel', 
	value: value, 
	password: EWD.password});
};

var setLogTo = function(value) {
  EWD.sockets.sendMessage({
    type: 'EWD.setParameter', 
	name: 'logTo', 
	value: value, 
	password: EWD.password
  });
  if (value === 'console') {
    Ext.getCmp('logFileOptionBtn').hide();
    Ext.getCmp('logFilePath').setDisabled(true);
  }
  if (value === 'file') {
    Ext.getCmp('logFileOptionBtn').show();
    Ext.getCmp('logFilePath').setDisabled(false);
  }
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

var resetProcessGrid = function(pid) {
  setTimeout(function() {
    //console.log("setTimeout: pid = " + pid);
    var row = rowByPid[pid];
    //console.log("row = " + row);
    EWD.stores.childProcesses.removeAt(row);
    rowByPid = {};
    var xpid;
    for (row = 0; row < EWD.stores.childProcesses.getCount(); row++) {
      xpid = EWD.stores.childProcesses.getAt(row).get('pid');
      rowByPid[xpid] = row;
    }
    //console.log("rowByPid: " + JSON.stringify(rowByPid));
  },5);
};

var workerProcess = function(action) {
  EWD.sockets.sendMessage({
    type: "EWD.workerProcess", 
    action:  action, 
    password: EWD.password
  });
};

var exitNode = function() {
  Ext.Msg.confirm('Attention!', 'Are you sure you really want to shut down the Node.js ewdGateway2 process?', function(button) {
    if (button === 'yes') {
      EWD.sockets.sendMessage({
        type: "EWD.exit", 
        password: EWD.password
      });
      Ext.Msg.alert('Information', 'The ewdGateway2 Node.js process has been closed down'); 
      closeMsg();
    }
  });
};
  
var clearLogFile = function() {
  EWD.sockets.sendMessage({
    type: 'setParameter', 
    name: 'clearLogFile', 
    password: EWD.password
  });
  Ext.Msg.alert('Information', 'Log file has been cleared'); 
  closeMsg();
};

var changeLogFile = function() {
  var path = Ext.getCmp('logFilePath').getValue();
  EWD.sockets.sendMessage({
    type: 'setParameter', 
    name: 'changeLogFile', 
    value: path, 
    password: EWD.password
  });
  Ext.Msg.alert('Information', 'Log file path changed to ' + path); 
  closeMsg();
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
  
var closeMsg = function() {
  Ext.defer(function() {
    Ext.MessageBox.hide();
  },1500);
};

var closeSession = function(sessid) {
  EWD.sockets.sendMessage({
    type: 'closeSession', 
    params: {
      sessid: sessid
    }
  });
};

var getSessionData = function(sessid) {
  EWD.sockets.sendMessage({
    type: 'getSessionData',
    params: {sessid: sessid}
  });
};

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
};

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

var getGlobalSubscripts = function(params) {
  console.log('sending getGlobalSubscripts msg - id = ' + params.nodeId);
  EWD.sockets.sendMessage({
    type: 'getGlobalSubscripts',
    params: {
      nodeId: params.nodeId,
      globalName: params.globalName,
      subscripts: params.subscripts
    }
  });  
};

var deleteGlobalNode = function(node) {
  EWD.node = node;
  if (node.raw.type === 'globalName') {
    node.raw.globalName = node.raw.text;
	node.raw.subscripts = '[]';
  }
  var ref = node.raw.globalName + node.raw.subscripts;
  Ext.Msg.confirm('Attention!', 'Are you sure you want to delete ' + ref, function(button) {
    if (button === 'yes') {
      EWD.sockets.sendMessage({
        type: "deleteGlobalNode", 
        params: {
          globalName: node.raw.globalName,
          subscripts: JSON.parse(node.raw.subscripts),
          nodeId: node.data.id
        }
      });
    }
    else {
      node.set('checked', false);
    }
  });
};

var updateGlobalList = function(globals) {
  var treeNode = Ext.getCmp('globalMenu').getRootNode();
  treeNode.removeAll();
  var data = [];
  for (var i = 0; i < globals.length; i++) {
    data.push({
      id: 'ewd.' + globals[i],
      text: globals[i],
      leaf: false,
      type: 'globalName',
      fetched: false,
      checked: false
    });
  }
  treeNode.appendChild(data);
};

EWD.onSocketsReady = function() {
  Ext.getCmp('loginBtn').show();
};

EWD.onSocketMessage = function(messageObj) {
  if (EWD.sockets.trace) console.log("serverMessageHandler: messageObj = " + JSON.stringify(messageObj));

  if (messageObj.type === 'EWD.form.login') {
    EWD.password = Ext.getCmp('password').getValue();
    if (messageObj.ok) Ext.getCmp('loginPanel').destroy();
    EWD.sockets.sendMessage({type: "EWD.startConsole", message:  "start", password: EWD.password});
    EWD.sockets.sendMessage({type: "getInterfaceVersion"});
    EWD.sockets.sendMessage({type: "getSessions"});
    EWD.sockets.sendMessage({type: 'getGlobals'});
  }
  
  if (messageObj.type === 'processInfo') {
    EWD.stores.buildStore.getAt(0).set('version',messageObj.data.nodeVersion);
    EWD.stores.buildStore.getAt(1).set('version',messageObj.data.build);
    EWD.stores.buildStore.getAt(2).set('version',messageObj.data['ewdQBuild']);
    EWD.stores.buildStore.getAt(3).set('version','Lite');	
    Ext.getCmp('qGrid').setTitle('Master Process: ' + messageObj.data.masterProcess);

    EWD.stores.childProcesses.removeAt(0);
    for (i = 0; i < messageObj.data.childProcesses.length; i++) {
      pidObj = messageObj.data.childProcesses[i];
      EWD.stores.childProcesses.add({pid: pidObj.pid, noOfRequests: pidObj.noOfRequests, available: pidObj.available});
      rowByPid[pidObj.pid] = i;
    }
    logging.interval = +messageObj.data.interval/1000;
    logging.level = +messageObj.data.traceLevel;
    logging.to = messageObj.data.logTo;
    Ext.getCmp('loggingLevel').setValue({level: logging.level});
    Ext.getCmp('logToGroup').setValue({logTo: logging.to});
    Ext.getCmp('logFilePath').setValue(messageObj.data.logFile);
    Ext.getCmp('interval').setValue(logging.interval);
    Ext.getCmp('intervalDisplay').setValue(logging.interval);
    messageObj = null;
    return;
  }
  
  if (messageObj.type === 'consoleText') {
    if (EWD.sockets.log) console.log("message received: " + JSON.stringify(messageObj));
    addLine(messageObj.text);
    messageObj = null;
    return;
  }
  
  if (messageObj.type === 'memory') {
    if (typeof EWD.stores.memoryHistory !== 'undefined') {
      timeSlotNo++;
      if (timeSlotNo > maxSlots) {
        EWD.stores.memoryHistory.removeAt(0);
        var chart = Ext.getCmp('memoryChart');
        var axis = chart.axes.get(1);
        axis.minimum++;
        axis.maximum++;
      }
      EWD.stores.memoryHistory.add({
	    rss: +messageObj.rss, 
		heapTotal: +messageObj.heapTotal, 
		heapUsed: +messageObj.heapUsed, 
		timeslot: timeSlotNo
      });
      Ext.getCmp('interval').setValue(+messageObj.interval/1000);
      //messageObj = null;
      return;
    }
  }
  
  if (messageObj.type === 'getInterfaceVersion') {
    var pieces = messageObj.message.split(';');
    EWD.stores.buildStore.getAt(4).set('version', pieces[0]);
    EWD.stores.buildStore.getAt(5).set('version', pieces[1]);  
    return;
  }
  
  if (messageObj.type === 'getSessions') {
    EWD.stores.sessionGridStore.loadData(messageObj.message);
    return;
  }
  
  if (messageObj.type === 'pidUpdate') {
    var pid = messageObj.pid;
    var row = rowByPid[pid];
    if (typeof row !== 'undefined') {
      var record = EWD.stores.childProcesses.getAt(row);
       record.set({noOfRequests: messageObj.noOfRequests, available: messageObj.available});
    }
    messageObj = null;
    return;
  }

  if (messageObj.type === 'queueInfo') {
    var rec = EWD.stores.queueStore.getAt(0);
    rec.set('length', messageObj.qLength);
    var max = rec.get('max');
    if (messageObj.qLength > max) rec.set('max', messageObj.qLength);
    messageObj = null;
    return;
  }
  
  if (messageObj.type === 'workerProcess') {
    if (messageObj.action === 'add') {
      rowByPid[messageObj.pid] = EWD.stores.childProcesses.getCount();
      EWD.stores.childProcesses.add({pid: messageObj.pid, noOfRequests: 0, available: true});
    }
    if (messageObj.action === 'remove') {
      if (EWD.stores.childProcesses.getCount() === 1) {
        Ext.Msg.alert('Error', 'ewdGateway2 requires at least 1 worker process');
      }
      else {
        var pid = messageObj.pid;
        var row = rowByPid[pid];
        if (typeof row !== 'undefined') {
          var record = EWD.stores.childProcesses.getAt(row);
          var no = record.get('noOfRequests');
          record.set('noOfRequests', '* ' + no);
        }
        resetProcessGrid(pid);
      }
    }
    messageObj = null;
    return;
  }
  
  if (messageObj.type === 'sessionDeleted') {
    //console.log('sessionDeleted message: ' + JSON.stringify(messageObj));
    //{"type":"sessionDeleted","json":{"sessid":"87"}}
    var index = EWD.stores.sessionGridStore.find('sessid', messageObj.json.sessid);
    EWD.stores.sessionGridStore.removeAt(index);
    messageObj = null;
    return;        
  }
  
  if (messageObj.type === 'newSession') {
    EWD.stores.sessionGridStore.add(messageObj.json);
    return;
  }
  
  if (messageObj.type === 'deleteGlobalNode') {
    var treeNode = Ext.getCmp('globalMenu').getRootNode().findChild('id', messageObj.message.nodeId, true ) ;
    treeNode.destroy();
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
  
  if (messageObj.type === 'getGlobals') {
    var globals = messageObj.message; 
    updateGlobalList(globals);
    EWD.firstGlobalName = [];
    EWD.globalName1 = globals[0];
    Ext.getCmp('prev100Btn').hide();
    if (globals.length === 25) {
      Ext.getCmp('next100Btn').show();
      EWD.lastGlobalName = globals[24];
      EWD.globalNameSeed = '';
    }
  } 
  
  if (messageObj.type === 'getNextGlobals') {
    var globals = messageObj.message; 
    updateGlobalList(globals);
    EWD.firstGlobalName.push(EWD.globalNameSeed);
    if (globals.length === 25) {
      Ext.getCmp('prev100Btn').show();
      EWD.lastGlobalName = globals[24];
    }
    else {
      Ext.getCmp('next100Btn').hide();
    }
    EWD.globalNameSeed = globals[0];
  } 

  if (messageObj.type === 'getPrevGlobals') {
    var globals = messageObj.message; 
    updateGlobalList(globals);
    if (globals.length === 25) {
      Ext.getCmp('next100Btn').show();
      EWD.lastGlobalName = globals[24];
    }
    if (globals[0] === EWD.globalName1) Ext.getCmp('prev100Btn').hide();
  } 

  if (messageObj.type === 'getGlobalSubscripts') {
    var subscripts = messageObj.message.subscripts;
    var treeNode = Ext.getCmp('globalMenu').getRootNode().findChild('id', messageObj.message.nodeId, true ) ;
    var subs = [];
    var subscript;
    var text;
    if (treeNode.raw.type === 'subscript') subs = JSON.parse(treeNode.raw.subscripts); 
    var data = [];
    for (var i = 0; i < subscripts.length; i++) {
      subscript = subscripts[i];
      text = subscript.name;
      subs.push(text);
      console.log('subs = ' + JSON.stringify(subs));
      if (subscript.value) text = text + ': ' + subscript.value;
      data.push({
        id: messageObj.message.nodeId + '.' + i,
        text: text,
        leaf: subscript.leaf,
        type: 'subscript',
        globalName: messageObj.message.globalName,
        subscripts: JSON.stringify(subs),
        fetched: false,
        checked: false
      });
      subs.pop();
    }
    treeNode.appendChild(data);   
  } 
  
  if (messageObj.type === 'importPathError') {
    if (messageObj.error.errno === 34) {
      Ext.Msg.alert('FilePath not found:', messageObj.error.path); 
      closeMsg();
    }
    else{
      Ext.Msg.alert('File Error', JSON.stringify(messageObj.error)); 
      closeMsg();
    }
  }
  
  if (messageObj.type === 'importFile') {
      Ext.Msg.alert('File Imported Successfully', messageObj.path); 
      closeMsg();
  }
  
};