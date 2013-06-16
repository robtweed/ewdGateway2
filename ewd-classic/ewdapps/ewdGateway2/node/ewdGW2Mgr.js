//module.change_code = 1;
module.exports = {

    initialise: function(ewd) {
      var path = 'http://cdn.sencha.io/ext-4.1.1-gpl';
      if (ewd.database === 'gtm') path = '/vista/ext-4.1';
      ewd.session.$('framework_rootPath')._value = path;
      var chart = ewd.session.$('memoryPlot');
      /*
      var rss = [];
      var timeslot = [];
      for (var i = 0; i <60; i++) {
        rss.push(0);
        timeslot.push(" " + i);
      }
      var data = {rss: rss, timeslot: timeslot};
      */
      var data = {rss: [0], 'timeslot': [0], heapTotal:[0], heapUsed: [0]};
      chart._setDocument(data);
      var memory = ewd.session.$('memory');
      data = {'1': {type: 'rss', mb: 0},'2': {type: 'Heap Total', mb: 0},'3': {type: 'Heap Used', mb: 0}};
      memory._setDocument(data);
      return '';
    },

    login: function(ewd) {
        var password = ewd.request.$('password')._value;
        if (password === '') return 'You must enter the ewdGateway2 Management password';

        var zewd = new ewd.mumps.Global("zewd");
        var gatewayPassword = zewd.$('ewdGatewayManager').$('password')._value;
        if (gatewayPassword !== password) return 'Invalid password';
        return '';
    },

    processInfo: function(ewd) {
      var childProcess = ewd.session.$('childProcess');
      var data = {'1': {pid: 1, noOfRequests: 0, available: false}};
      childProcess._setDocument(data);
      var builds = ewd.session.$('builds');
      data = {
        '1': 
          {name: 'Node.js', 
           version: ''
          },
        '2':
          {name: 'ewdGateway2', 
           version: ''
          },
        '3': {
          name: 'ewdQ', 
          version: ''
        },
        '4': {
          name: 'EWD', 
          version: ''
        },
        '5': {
          name: 'Database', 
          version: ''
        }
      };
      builds._setDocument(data);
      var queue = ewd.session.$('queue');
      data = {'1': {length: '0', max: '0'}};
      queue._setDocument(data);
      return '';
    },

    getModules: function(ewd) {
        var no = 0;
        var appObj;
        var childNo;
        var tree = {};
        var modules = new ewd.mumps.GlobalNode("zewd", ['requires']);
        modules._forEach(function(appName, gNode) {
          no++;
          tree[no] = {
            text: appName,
            child: {}
          };
          appObj = tree[no].child;
          childNo = 0;
          gNode._forEach(function(moduleName, mNode) {
            childNo++;
            var path = mNode._value;
            appObj[childNo] = {
              text: moduleName + ': ' + path,
              nvp: appName + '^' + moduleName + '^' + path
            };
          });
        });
        var menu = {};
        menu[1] = {
          text: 'Applications', 
          child: tree
        };
        ewd.session.$('modules')._setDocument(menu);
        return '';
    },
    
    initialiseSessions: function(ewd) {
      var mySessid = ewd.session.$('ewd_sessid')._value;
      var sessions = ewd.session.$('sessions');
      var ewdSessions = new ewd.mumps.GlobalNode("%zewdSession", ['session']);
      var data = {};
      var rowNo = 0;
      ewdSessions._forEach(function(sessid, session) {
        var appName = session.$('ewd_appName')._value;
        var expiry = session.$('ewd_sessionExpiry')._value;
        expiry = (expiry - 4070908800) * 1000;
        var expireDate = new Date(expiry);
        rowNo++;
        var currentSession = (sessid === mySessid);
        data[rowNo] = {sessid: sessid, appName: appName, expiry: expireDate.toUTCString(), currentSession: currentSession};
      });
      sessions._setDocument(data);
      return '';
    },

    webSocketHandler: function(ewd) {
      console.log("ewdGWMgr2 trying to handle message: " + JSON.stringify(ewd.webSocketMessage));
      //return {test: 'websocketHandler finished', done: 1};
      // response arrives in browser as {type: xxxx, "message":{"test":"websocketHandler finished","done":1}} 
      // where xxx is the same type as received by webSocketHandler
      var wsMsg = ewd.webSocketMessage;
      var params = wsMsg.params;

      if (wsMsg.type === 'getSessionData') {
        var session = new ewd.mumps.GlobalNode('%zewdSession', ['session', params.sessid]);
        return session._getDocument();
      }

      if (wsMsg.type === 'getNewSession') {
        var session = new ewd.mumps.GlobalNode('%zewdSession', ['session', params.sessid]);
        var appName = session.$('ewd_appName')._value;
        var expiry = session.$('ewd_sessionExpiry')._value;
        expiry = (expiry - 4070908800) * 1000;
        var expireDate = new Date(expiry).toUTCString();
        return {sessid: params.sessid, appName: appName, expiry: expireDate};
      }

      if (wsMsg.type === 'updateSessionGrid') {
        var ewdSessions = new ewd.mumps.GlobalNode("%zewdSession", ['session']);
        var data = {};
        ewdSessions._forEach(function(sessid, session) {
          var expiry = session.$('ewd_sessionExpiry')._value;
          expiry = (expiry - 4070908800) * 1000;
          var expireDate = new Date(expiry);
          data[sessid] = {expiry: expireDate.toUTCString()};
        });
        return data;
      }

      if (wsMsg.type === 'closeSession') {
        //var funcObj = {function: 'closeSession^%zewdNode', arguments: [params.sessid]};
        //console.log("invoking " + JSON.stringify(funcObj));
        var resultObj = ewd.mumps.function('closeSession^%zewdNode', params.sessid);
        console.log("function result: " + JSON.stringify(resultObj));
        return {ok: 1};
      }

      /*
      if (wsMsg.type === 'registerModule') {
        var modules = new ewd.mumps.GlobalNode("zewd", ['requires']);
        modules.$(params.appName).$(params.moduleName)._value = params.path;
        return params;
      }
      */
    }

};
