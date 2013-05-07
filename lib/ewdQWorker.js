/*

 ----------------------------------------------------------------------------
 | ewdQWorker: Child Worker Process for ewdGateway2                         |
 |                                                                          |
 | Provides the interface between Node.js and GT.M / Cache                  |
 |                                                                          |
 | Copyright (c) 2013 M/Gateway Developments Ltd,                           |
 | Reigate, Surrey UK.                                                      |
 | All rights reserved.                                                     |
 |                                                                          |
 | http://www.mgateway.com                                                  |
 | Email: rtweed@mgateway.com                                               |
 |                                                                          |
 |                                                                          |
 | Licensed under the Apache License, Version 2.0 (the "License");          |
 | you may not use this file except in compliance with the License.         |
 | You may obtain a copy of the License at                                  |
 |                                                                          |
 |     http://www.apache.org/licenses/LICENSE-2.0                           |
 |                                                                          |
 | Unless required by applicable law or agreed to in writing, software      |
 | distributed under the License is distributed on an "AS IS" BASIS,        |
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. |
 | See the License for the specific language governing permissions and      |
 |  limitations under the License.                                          |
 ----------------------------------------------------------------------------

  Build 6; 07 May 2013

*/

var fs = require("fs");
var os = require("os");
var util = require("util");

var cache;
var mumps;

var EWD = {
  hSeconds: function() {
    // get current time in seconds, adjusted to Mumps $h time
    var date = new Date();
    var secs = Math.floor(date.getTime()/1000);
    var offset = date.getTimezoneOffset()*60;
    var hSecs = secs - offset + 4070908800;
    return hSecs;
  },
  getSessid: function(token) {
    var ewdTokens = new mumps.GlobalNode('%zewdSession',['tokens']);
    var sessid = ewdTokens.$(token)._value;
    return sessid.split('~')[0];
  },
  isTokenExpired: function(token) {
    var sessid = this.getSessid(token);
    if (sessid === '') return true;
    var ewdSession = new mumps.GlobalNode('%zewdSession',['session',sessid]);
    var expiry = +ewdSession.$('ewd_sessionExpiry')._value;
    ewdSession = null;
    token = null;
    sessid = null;
    if (expiry === '') return true;
    if (expiry > this.hSeconds()) return false;
    return true;
  },
  getSession: function(token) {
    if (this.isTokenExpired(token)) {
      return '';
    }
    else {
      var sessid = this.getSessid(token);
      var ewdSession = new mumps.GlobalNode('%zewdSession',['session',sessid]);
      ewdSession.sessid = ewdSession.$('ewd_sessid')._value;
      ewdSession.app = ewdSession.$('ewd_appName')._value;
      ewdSession.page = ewdSession.$('ewd_pageName')._value;
      return ewdSession;
    }
  },
  getRequest: function(ewdSession) {
    return new mumps.GlobalNode("%zewdSession",['request',ewdSession.sessid]);
  },
  getServer: function(ewdSession) {
    return new mumps.GlobalNode("%zewdSession",['server',ewdSession.sessid]);
  }
};

var ewdQWorker = {
  module: {},
  moduleByPath: {},
  ewdQPath: process.argv[2],
  saveJSON: function(globalName, json) {
    var node;
    ewdQ.traverseJSON(json, [process.pid], function(subscripts, value) {
      node = {global: globalName, subscripts: subscripts, data: value};
      ewdQWorker.log("saveJSON: about to set: " + JSON.stringify(node), 3);
      cache.set(node);
    });
  },
  retrieveSubTree: function(node) {
    var global = node.global;
    var subscripts = JSON.stringify(node.subscripts);
 
    var retrieveData = function(node) {
      var subs = '';
      var data;
      var value;
      var obj = {};
      node.subscripts.push(subs);
      do {
        subs = cache.order(node).result;
        if (subs !== '') {
          data = cache.data(node).defined;

          if (data === 10) {
            var newNode = {global: node.global, subscripts: node.subscripts};
            var subObj = retrieveData(newNode);
            obj[subs] = subObj;
            node.subscripts.pop();
          }

          if (data === 1) {
            value = cache.get(node).data;
            obj[subs] = value;
          }
        }
      } while (subs !== '')
      return obj;  
    };
 
    var obj = retrieveData(node);
    node.subscripts.pop();
    return {node: {global: global, subscripts: JSON.parse(subscripts)}, object: obj};
  },
  cacheActionMethod: function(action) {
    if (typeof action.logTo !== 'undefined') ewdQWorker.logTo = action.logTo;
    if (typeof action.logFile !== 'undefined') ewdQWorker.logFile = action.logFile;
    ewdQWorker.log("Action method: Process " + process.pid + ": action = " + JSON.stringify(action),3);
    var result = '';
    var resultObj;
    var funcObj;
    if (action.exit) {
      //cache.close();
      setTimeout(function() {
        process.exit(1);
      },500);
      return {pid: process.pid, type: 'processExit'};
    }
    else {
      if (action.type === 'onBeforeRender') {
        ewdQWorker.log(process.pid + ": onBeforeRender method request - " + JSON.stringify(action), 2);
        ewdQWorker.log("onBeforeRender started at " + ewdQWorker.elapsedTime(), 1);
        // load the module if not already loaded (get rid of the previous stuff that did this)
        // get the sessid from the token
        // run the method and return its return value
        var ewdSession = EWD.getSession(action.token);
        if (ewdSession === '') return action.token + " has expired or is invalid";

        var zewd = new mumps.Global('zewd');
        var useWSHandler = false;
        if (typeof action.handlerModule !== 'undefined') {
          useWSHandler = true;
          action.appName = ewdSession.app.toLowerCase();
          action.module = action.handlerModule;
          action.method = action.handlerFunction;
          if (action.messageType === 'reloadModule') {
            action.appName = action.params.appName;
            action.module = action.params.moduleName;
            action.reload = '1';
          }
        }
        var path = zewd.$('requires').$(action.appName).$(action.module)._value;
        if (path === '') return 'Unable to find specified module: ' + action.appName + "." + action.module;

        if (zewd.$('reloadRequire').$(process.pid).$(action.module)._value !== '') {
          if (typeof ewdQWorker.module[action.module] !== 'undefined') {
            delete ewdQWorker.module[action.module];
            zewd.reloadRequire.$(process.pid).$(action.module)._delete();
            delete require.cache[require.resolve(path)];
          }
        }
        if ((action.reload === '1')||(typeof ewdQWorker.module[action.module] === 'undefined')) {
          ewdQWorker.log("(re)loading " + action.module + "; action.reload = " + action.reload, 2);
          if (action.reload === '1') {
            var pids = action.pids;
            var i;
            var pid;
            for (i = 0; i < pids.length; i++) {
             pid = pids[i].pid;
             if (+pid !== +process.pid) {
               zewd.$('reloadRequire').$(pid).$(action.module)._value = 1;
             }
            }
            if (typeof ewdQWorker.module[action.module] !== 'undefined') {
              delete require.cache[require.resolve(path)];
              ewdQWorker.log("deleted require cache for " + require.resolve(path), 2);
            }
            else {
              ewdQWorker.log("module " + action.module + ' not yet loaded so delete ignored', 2);
            }
          }
          try {
            if (typeof ewdQWorker.module[action.module] === 'undefined') {
              ewdQWorker.moduleByPath[path] = action.module;
              ewdQWorker.log("fs.watch started for " + action.module, 2);
              fs.watch(path, function(event, filename) {
                ewdQWorker.log("file watch triggered for " + filename + "; event = " + event, 2);
                if (event === 'change') {
                  delete require.cache[require.resolve(path)];
                  var module = ewdQWorker.moduleByPath[path];
                  try {
                    ewdQWorker.module[module] = require(path);
                    ewdQWorker.log(process.pid + ': ' +  module + '(' + path + ') reloaded successfully', 2);
                  }
                  catch (err) {
                    ewdQWorker.log(process.pid + ': ' + module + '(' + path + ') could not be reloaded', 2);
                  }
                }
              });
            }
            ewdQWorker.module[action.module] = require(path);
            ewdQWorker.log(process.pid + ": " + path + " loaded successfully", 2);
            if (typeof action.method === 'undefined') {
              // reload signalled so finish here
              zewd = null;
              ewdSession = null;
              return '';
            }
          }
          catch(err) {
            zewd = null;
            ewdSession = null;
            return "Unable to load module " + action.module + ' at path ' + path + "; error = " + JSON.stringify(err); 
          }
        }
        if (action.messageType === 'reloadModule') {
          zewd = null;
          ewdSession = null;
          return action.module + ' loaded successfully';
        }
        else if (typeof ewdQWorker.module[action.module][action.method] === 'undefined') {
          return action.method + " is not a method in the " + action.module + " module";
          zewd = null;
          ewdSession = null;
        }
        else {
          try {
            var params = {
              session: ewdSession,
              mumps: mumps
            }
            if (useWSHandler) {
              params.webSocketMessage = {
                type: action.messageType,
                params: action.params
              };
            }
            else {
              params.request = EWD.getRequest(ewdSession);
              params.server = EWD.getServer(ewdSession);
              params.database = ewdQWorker.database.type;
            }
            params.sendWebSocketMsg = function(content) {
              var token;
              if (typeof content.token !== 'undefined') {
                token = content.token;
                delete content.token;
              }
              else {
                token = this.session.$('ewd_wstoken')._value;
              }
              process.send({
                ok: process.pid,
                type: 'wsMessage',
                token: token,
                content: content
              });
            };
            var result = ewdQWorker.module[action.module][action.method](params);
            ewdSession = null;
            ewdQWorker.log("onBeforeRender completed at " + ewdQWorker.elapsedTime(), 1);
            return result;
          }
          catch(err) {
            zewd = null;
            ewdSession = null;
            return "Error returned by " + action.module + "." + action.method + ": " + err;
          }
        }
      }

      if (action.type === 'logHTTP') {
        // httpLog request
        ewdQWorker.log(process.pid + " httpLog: action = " + JSON.stringify(action), 3);
        var zewdHTTP = new mumps.Global('zewdHTTP');
        var index = zewdHTTP._increment();
        var logGlo = new mumps.GlobalNode('zewdHTTP',[index]);
        logGlo.$('time')._value = action.time;
        logGlo.$('timestamp')._value = action.timeStamp;
        logGlo.$('host')._value = action.headers.host;
        if (typeof action.headers['user-agent'] !== 'undefined') logGlo.$('user-agent').value = action.headers['user-agent'];
        logGlo.$('url')._value = action.url;
        logGlo.$('method')._value = action.method;
        logGlo.$('httpVersion')._value = action.httpVersion;
        logGlo.$('remote-addr')._value = action.remoteAddr;
        logGlo.$('reponse-code')._value = action.responseCode;
        zewdHTTP = null;
        logGlo = null;
      }
      if (action.type === 'initialise') {
        // initialising the parameters for this worker process
        ewdQWorker.httpPort = action.params.httpPort;
        ewdQWorker.log(process.pid + " initialise: params = " + JSON.stringify(action.params), 3);
        ewdQWorker.ewdQPath = action.params.ewdQPath;
        ewdQWorker.ewdGlobalsPath = action.params.ewdGlobalsPath;
        ewdQWorker.nodePath = action.params.nodePath;
        ewdQWorker.traceLevel = action.params.traceLevel;
        ewdQWorker.logTo = action.params.logTo;
        ewdQWorker.logFile = action.params.logFile;
        ewdQWorker.startTime = action.params.startTime;
        ewdQWorker.database = action.params.database;
        ewdQWorker.webSockets = action.params.webSockets;
        ewdQWorker.logToBrowser = action.params.logToBrowser;
        var hNow = action.params.hNow;
        var delim = '/'
        if (os.type().indexOf("Windows") !== -1) delim = '\\';
        var filePath = ewdQWorker.database.outputFilePath;
        if (filePath.slice(-1) !== delim) filePath = filePath + delim;
        ewdQWorker.database.outputFile = filePath + 'ewdOutput' + process.pid + '.txt';
        mumps = require(ewdQWorker.ewdGlobalsPath);
        var globals = require(ewdQWorker.database.nodePath);
        if (ewdQWorker.database.type === 'cache') {
          cache = new globals.Cache();
          cache.open(ewdQWorker.database);
        }
        else if (ewdQWorker.database.type === 'gtm') {
          cache = new globals.Gtm();
          cache.open();
          ewdQWorker.database.namespace = '';
        }
        mumps.init(cache);
        var zewd = new mumps.Global('zewd');
        if (typeof action.params.https.httpPort !== 'undefined') {
          var funcObj = {function: 'setProcessLock^%zewdNode', arguments: [action.params.https.httpPort]};
          ewdQWorker.log("invoking function " + JSON.stringify(funcObj), 3);
          var resultObj = cache.function(funcObj);
        }
        if (action.params.no === 1) {
          var funcObj;
          var resultObj;
          if (ewdQWorker.database.type === 'cache') {
            funcObj = {function: 'startHTTPService^%zewdNode', arguments: []};
            ewdQWorker.log("invoking function " + JSON.stringify(funcObj), 3);
            resultObj = cache.function(funcObj);
          }
          funcObj = {function: 'setProcessLock^%zewdNode', arguments: [action.params.httpPort]};
          ewdQWorker.log("invoking function " + JSON.stringify(funcObj), 3);
          resultObj = cache.function(funcObj);
          mumps.deleteGlobal('CacheTempRequest');
          mumps.deleteGlobal('CacheTempBuffer');
          mumps.deleteGlobal('CacheTempPayload');
          zewd.$('webSocketMessage')._delete();
          var wsParams = zewd.$('webSocketParams').$(action.params.httpPort);
          wsParams._delete();
          zewd.$('reloadRequire')._delete();
          if (typeof action.params.management.password !== 'undefined') {
            zewd.$('ewdGatewayManager').$('password')._value = action.params.management.password;
            zewd.ewdGatewayManager.$('path')._value = action.params.management.path;
          }
          zewd.$('nodeWorkers').$(action.params.httpPort)._forEach(function(pid,node) {
            //console.log("node._value = " + node._value + "; hNow = " + hNow);
            if (+node._value !== +hNow) node._delete();
          });
          zewd.$('websocketHandler').$('demo')._value = 'websocketHandlerDemo^%zewdNode';
          //zewd.webSocketParams.$('host')._value = action.params.webSockets.host;
          wsParams.$('port')._value = action.params.httpPort;
          var ssl = 0;
          if (action.params.https.enabled) ssl = 1;
          wsParams.$('ssl')._value = ssl;
          if (action.params.https.enabled) {
            if (typeof action.params.https.useProxy !== 'undefined') {
              if (action.params.https.useProxy) {
                wsParams.$('useProxy')._value = 1;
                if (typeof action.params.https.proxyHost !== 'undefined') wsParams.$('proxyHost')._value = action.params.https.proxyHost;
                if (typeof action.params.https.proxyPort !== 'undefined') wsParams.$('proxyPort')._value = action.params.https.proxyPort;
              }
              else {
                wsParams.$('useProxy')._value = 0;
                //console.log("action.params=" + JSON.stringify(action.params));
                if (typeof action.params.https.httpPort !== 'undefined') {
                  wsParams.$('httpPort')._value = action.params.https.httpPort;
                  //funcObj = {function: 'setProcessLock^%zewdNode', arguments: [action.params.https.httpPort]};
                  //ewdQWorker.log("invoking function " + JSON.stringify(funcObj), 3);
                  //resultObj = cache.function(funcObj);
                }
              }
            }
          }
          wsParams.$('webSocketsPath')._value = action.params.webSockets.path;
        }
        zewd.$('nodeWorkers').$(action.params.httpPort).$(process.pid)._value = hNow;
        //console.log("^zewd(nodeWorkers) set for " + process.pid + " with value " + hNow);
        return;
      }
      if (action.type === 'getJSON') {
        ewdQWorker.log("worker process " + process.pid + ": received getJSON request - " + JSON.stringify(action), 2);
        //action = {"type":"getJSON","globalName":"zewd","subscripts":["ewdGateway"],"requestNo":"JSON1"}
        var node = {
          global: action.global,
          subscripts: action.subscripts
        };
        var result = ewdQWorker.retrieveSubTree(node);
        cache.kill(node);
        if (action.global === 'zewd') {
          if (action.subscripts[0] === 'ewdGateway') {
            if (result.object.logTo === 'console') ewdQWorker.logTo = 'console';
            if (result.object.logTo === 'global') ewdQWorker.logTo = 'global';
            if (result.object.logTo === 'file') ewdQWorker.logTo = 'file';
            if (typeof result.object.traceLevel !== 'undefined') ewdQWorker.traceLevel = result.object.traceLevel;
          }
        }
        return result.object;
      }
      if (action.type === 'http') {
        ewdQWorker.traceLevel = action.traceLevel;
        var query = '';
        if (typeof action.query !== 'undefined') query = JSON.stringify(action.query);
        var content = action.content;
        if (content !== '') {
          var nvps=content.split("&");
          var nvp;
          var name;
          var value;
          var i;
          for (i = 0; i < nvps.length; i++) {
            nvp = nvps[i].split("=");
            name = nvp[0];
            value = nvp[1];
            ewdQWorker.log("content nvp " + i + ": " + name + " = " + value, 2);
            if (typeof action.contents === 'undefined') action.contents = {};
            if (typeof action.contents[nvp[0]] === 'undefined') {
              action.contents[nvp[0]] = [];
              action.contents[nvp[0]].push(unescape(nvp[1]));
            }
            else {
              action.contents[nvp[0]].push(unescape(nvp[1]));
            }			
          }
          delete action.content;
          ewdQWorker.log("content = " + JSON.stringify(action.contents), 2);
        }
        ewdQWorker.log("saving headers to GT.M at " + ewdQWorker.elapsedTime(), 2);
        ewdQWorker.saveJSON("CacheTempRequest", action);
        ewdQWorker.log("**** action saved to GT.M: " + JSON.stringify(action),3);

        var scriptName = action.headers.script_name.split('/');
        var app = scriptName[2].toLowerCase();
        var page = scriptName[3].toLowerCase();
        var ext = ".ewd";
        if (page.indexOf('.mgwsi') !== -1) ext = '.mgwsi';
        page = page.split(ext)[0];

        /*
        // 1) does this app/page need any requires?
        //        ^zewd("requires",app,page,moduleName)=path
        // 2) if so: load them, unless already loaded
        // 3) does this app/page have a JS-based pre-page script?
        // 4) if so: invoke it

        var zewd = new mumps.Global('zewd');
        zewd.$('requires').$(app).$(page)._forEach(function(key,gnode) {
          var path = gnode._value
          if (typeof ewdQWorker.module[key] === 'undefined') {
            try {
              ewdQWorker.module[key] = require(path);
              ewdQWorker.log("require module " + key + " loaded from path " + path, 2);
              ewdQWorker.module[key].myTestFunc();
            }
            catch(err) {
              ewdQWorker.log("require module " + key + " unable to be loaded from path " + path, 2);
            }
          }
        });
        */
 
        ewdQWorker.log("invoking cache^%zewdNode at " + ewdQWorker.elapsedTime(), 2);

        funcObj = {function: 'cache^%zewdNode', arguments: [process.pid, ewdQWorker.database.namespace, ewdQWorker.database.outputFile]};
        ewdQWorker.log("invoking function " + JSON.stringify(funcObj), 3);
        resultObj = cache.function(funcObj);

        /*
        funcObj = {function: 'escapeBuffer^%zewdGTMRuntime', arguments: [process.pid]};
        resultObj = cache.function(funcObj);
        ewdQWorker.log("starting fetching response at " + ewdQWorker.elapsedTime(), 2);
        var text = '';
        var node = {global: "CacheTempBuffer", subscripts: [process.pid, ""]};
        var html;
        ewdQWorker.log("about to fetch results: node = " + JSON.stringify(node), 3);
        while ((node = cache.order(node)).result != "") {
          html = cache.get(node).data;
          text = text + html;
        }
        ewdQWorker.log("response fetched at " + ewdQWorker.elapsedTime(), 2);
        */

        ewdQWorker.log("Retrieving response from output file at " + ewdQWorker.elapsedTime(), 2);
        try {
          text = fs.readFileSync(ewdQWorker.database.outputFile, 'utf8');
          fs.unlinkSync(ewdQWorker.database.outputFile);
        }
        catch(err) {
          text = "An back-end error occurred and no output file was created";
          ewdQWorker.log("An error occurred in back-end processing logic!",1);
        }
        mumps.deleteGlobalNode('CacheTempRequest',[process.pid]);
        ewdQWorker.log("finished receiving response at " + ewdQWorker.elapsedTime(), 2);
        node = null;
        resultObj = null;
        funcObj = null;
        zewd = null;
        action = null;
        content = null;
        return text;
      }
    }
    if (action.type === 'socket') {
      ewdQWorker.traceLevel = action.traceLevel;
      ewdQWorker.log("Socket request at " + ewdQWorker.elapsedTime(), 2);
      ewdQWorker.log("Socket request: action = " + JSON.stringify(action), 3);
      if (action.messageType === 'ewdGetFragment') {
        var args = [action.page, action.targetId, action.nvp, action.token, ewdQWorker.database.outputFile];
        ewdQWorker.log("Running fragmentBySocket^%zewdNode at " + ewdQWorker.elapsedTime(), 2);
        var resultObj = cache.function({function: "fragmentBySocket^%zewdNode", arguments: args});
        ewdQWorker.log("Retrieving socket fragment from output file at " + ewdQWorker.elapsedTime(), 2);
        var text = fs.readFileSync(ewdQWorker.database.outputFile, 'utf8');
        fs.unlinkSync(ewdQWorker.database.outputFile);
        // remove HTTP header
        var pos = text.search('\r\n\r\n') + 4;
        return text.substr(pos);
      }
      else {
        var resultObj = cache.function({function: "processSocketMsg^%zewdNode", arguments: [action.messageType, action.message, action.token]});
      }
      return resultObj.result;
    }
  },
  elapsedTime: function() {
    var now = new Date().getTime();
    return (now - ewdQWorker.startTime)/1000;
  },
  log: function(message, level, clearLog) {
    if (+level <= +ewdQWorker.traceLevel) {
      if (ewdQWorker.logTo === 'console') {
        console.log(message);
      }
      if (ewdQWorker.logTo === 'global') {
        ewdQWorker.logToGlobal(message);
      }
      if (ewdQWorker.logTo === 'file') {
        ewdQWorker.logToFile(message, clearLog);
      }
	  try {
        process.send({ok: process.pid, type: 'log', message: message});
      }
	  catch (err) {
      }
    }
    message = null;
    level = null;
  },
  logToGlobal: function(message) {
    var logMessage = message;
    var gloRef = {global: ewdGateway.logGlobal, subscripts: []};
    ewdQWorker.queueCommand('increment', gloRef, function(error, results) {
      var index = results._value;
      var gloRef = {global: ewdGateway.logGlobal, subscripts: [index], value: logMessage};
      ewdQWorker.queueCommand('set', gloRef, function(error, results) {
      });
    });
  },
  logToFile: function(message, clearLog) {
    var logpath = ewdQWorker.logFile;
    var s = new Date().getTime() + ': ' + process.pid + ': ' + message.toString().replace(/\r\n|\r/g, '\n'); // hack
    var flag = 'a+';
    if (clearLog) flag = 'w+';
    var fd = fs.openSync(logpath, flag, 0666);
    fs.writeSync(fd, s + '\r\n');
    fs.closeSync(fd);
  }
};


process.on('exit',function() {
  cache.close();
  ewdQWorker.log("*** " + process.pid + " closed cache", 2);
});

var ewdQ = require(ewdQWorker.ewdQPath);
ewdQ.childProcess.handler(ewdQWorker.cacheActionMethod);



