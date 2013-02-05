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

  Build 3; 24 January 2013

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
    ewdQWorker.log("Action method: Process " + process.pid + ": action = " + JSON.stringify(action),3);
    var result = '';
    var resultObj;
    var funcObj;
    if (action.exit) {
      //cache.close();
      process.exit(1);
    }
    else {
      if (action.type === 'onBeforeRender') {
        ewdQWorker.log("***!!!!!!**** " + process.pid + ": onBeforeRender method request - " + JSON.stringify(action), 1);
        ewdQWorker.log("onBeforeRender started at " + ewdQWorker.elapsedTime(), 1);
        // load the module if not already loaded (get rid of the previous stuff that did this)
        // get the sessid from the token
        // run the method and return its return value
        var ewdSession = EWD.getSession(action.token);
        if (ewdSession === '') return action.token + " has expired or is invalid";

        var zewd = new mumps.Global('zewd');
        var appName = ewdSession.app.toLowerCase();
        var path = zewd.$('requires').$(appName).$(action.module)._value;

        if (zewd.$('reloadRequire').$(process.pid)._value !== '') {
          delete ewdQWorker.module[action.module];
          zewd.reloadRequire.$(process.pid)._delete();
          delete require.cache[require.resolve(path)];
        }

        if ((+action.reload === 1)||(typeof ewdQWorker.module[action.module] === 'undefined')) {
          console.log("(re)loading " + action.module);
          if (+action.reload === 1) {
            var pids = action.pids;
            var i;
            var pid;
            for (i = 0; i < pids.length; i++) {
             pid = pids[i].pid;
             if (+pid !== +process.pid) {
               zewd.$('reloadRequire').$(pid)._value = 1;
             }
            }
            delete require.cache[require.resolve(path)];
            console.log("deleted require cache for " + require.resolve(path));
          }
          try {
            ewdQWorker.module[action.module] = require(path);
            console.log(process.pid + ": " + path + " loaded");
            zewd = null;
          }
          catch(err) {
            zewd = null;
            ewdSession = null;
            return "Unable to load Node.js module " + action.module + 'at path ' + path; 
          }
        }
        if (typeof ewdQWorker.module[action.module][action.method] === 'undefined') {
          return action.method + " is not a method in the " + action.module + " module";
          zewd = null;
          ewdSession = null;
        }
        else {
          try {
            var params = {
              session: ewdSession,
              request: EWD.getRequest(ewdSession),
              server: EWD.getServer(ewdSession),
              mumps: mumps
            }
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
        logGlo.$('user-agent')._value = action.headers['user-agent'];
        logGlo.$('url')._value = action.url;
        logGlo.$('method')._value = action.method;
        logGlo.$('httpVersion')._value = action.httpVersion;
        logGlo.$('remote-addr')._value = action.remoteAddr;
        logGlo.$('reponse-code')._value = action.responseCode;
      }
      if (action.type === 'initialise') {
        // initialising the parameters for this worker process
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
        if (action.params.no === 1) {
          if (ewdQWorker.database.type === 'cache') {
            var funcObj = {function: 'startHTTPService^%zewdNode', arguments: []};
            ewdQWorker.log("invoking function " + JSON.stringify(funcObj), 3);
            var resultObj = cache.function(funcObj);
          }
          mumps.deleteGlobal('CacheTempRequest');
          mumps.deleteGlobal('CacheTempBuffer');
          mumps.deleteGlobal('CacheTempPayload');
          var zewd = new mumps.Global('zewd');
          zewd.$('webSocketMessage')._delete();
          zewd.$('webSocketParams')._delete();
          zewd.$('reloadRequire')._delete();
          if (typeof action.params.management.password !== 'undefined') {
            zewd.$('ewdGatewayManager').$('password')._value = action.params.management.password;
            zewd.ewdGatewayManager.$('path')._value = action.params.management.path;
          }
          zewd.$('websocketHandler').$('demo')._value = 'websocketHandlerDemo^%zewdNode';
          zewd.webSocketParams.$('host')._value = action.params.webSockets.host;
          zewd.webSocketParams.$('port')._value = action.params.httpPort;
          var ssl = 0;
          if (action.params.https.enabled) ssl = 1;
          zewd.webSocketParams.$('ssl')._value = ssl;
          if (action.params.https.enabled) {
            zewd.webSocketParams.$('proxyHost')._value = action.params.https.proxyHost;
            zewd.webSocketParams.$('proxyPort')._value = action.params.https.proxyPort;
          }
          zewd.webSocketParams.$('webSocketsPath')._value = action.params.webSockets.path;
        }
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
              console.log("require module " + key + " loaded from path " + path);
              ewdQWorker.module[key].myTestFunc();
            }
            catch(err) {
              console.log("require module " + key + " unable to be loaded from path " + path);
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
    }
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
  },
};


process.on('exit',function() {
  ewdQWorker.log("*** " + process.pid + " closing cache");
  cache.close();
});

var ewdQ = require(ewdQWorker.ewdQPath);
ewdQ.childProcess.handler(ewdQWorker.cacheActionMethod);



