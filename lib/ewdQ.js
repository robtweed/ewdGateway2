/*

 ----------------------------------------------------------------------------
 | ewdQ: Queue Manager/Dispatcher for GT.M & Cache                          |
 |                                                                          |
 | Copyright (c) 2012-13 M/Gateway Developments Ltd,                        |
 | Reigate, Surrey UK.                                                      |
 | All rights reserved.                                                     |
 |                                                                          |
 | http://www.mgateway.com                                                  |
 | Email: rtweed@mgateway.com                                               |
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

 ************************************************************
 *
 * Running the module module:
 *
 *   var ewdQ = require('./ewdQ');
 *   var params = {poolSize: 4};
 *   ewdQ.start(params, function() {
 *     console.log("ewdQ started!!!");
 *     // away you go!
 *   });
 *
 *
 * Startup parameters
 *
 *  The parameters below can be edited as required
 *    poolSize = the number of Node child processes to fire up (deafult = 5)
 *    childProcessPath = the filepath of the Node child process Javascript file
 *                       (default = __dirname + '/ewdQWorker.js')
 *    monitorInterval = no of milliseconds delay between displaying process usage
 *                      in console (default = 30000)
 *
 *   trace = true if you want to get a detailed activity trace to the Node.js console
 *   silentStart = true if you don't want any message to the console when ewdQ starts
 *                 (default = false)
 *
 *
 *   Add an action to the queue using:
 *
 *      var requestObj = {action: {x:1,y:2}, response: response, otherStuff: 'etc...'};
 *      // Just the action property is sent to the child process
 *      // Any other properties are retained for the master process response handler
 *
 *      ewdQ.addToQueue(requestObj, responseHandler);
 *
 *
 *   The responseHandler allows you to define a method that the master Node process
 *   will run when the child process returns its response, eg to send a web page response
 *   back to a browser.
 *
 *   Example response handler:
 *
 *    var responseHandler = function(requestObj, results) {
 *      // results contains whatever your child process returns to the master process
 *      var response = requestObj.response;
 *      var html = "<html>";
 *      html = html + "<head><title>ewdQ action response</title></head>";
 *      html = html + "<body>";
 *      html = html + "<p>Action was processed !</p><p>Results: " + results + "</p>";
 *      html = html + "</body>";
 *      html = html + "</html>";
 *      response.writeHead(200, {"Content-Type": "text/html"});  
 *      response.write(html);  
 *      response.end();  
 *    };

 ************************************************************

  Get required modules:

*/

var cp = require('child_process');
var events = require("events");
var util = require('util'); 
var fs = require("fs");

/*
  Define the ewdQ object
*/

var ewdQ = {
  buildNo: 10,
  buildDate: "10 June 2013",
  setMonitorInterval: function(value) {
    ewdQ.monitorInterval = value;
  },
  hSeconds: function() {
    // get current time in seconds, adjusted to Mumps $h time
    var date = new Date();
    var secs = Math.floor(date.getTime()/1000);
    var offset = date.getTimezoneOffset()*60;
    var hSecs = secs - offset + 4070908800;
    return hSecs;
  },
  setTraceLevel: function(value) {
    ewdQ.traceLevel = value;
  },
  setPoolSize: function(value) {
    ewdQ.poolSize = value;
  },
  setLogTo: function(value) {
    ewdQ.logTo = value;
  },
  setLogFile: function(value) {
    ewdQ.logFile = value;
  },
  setProcessAvailable: function(pid) {
    if (typeof ewdQ.process[pid] !== 'undefined') {
      ewdQ.process[pid].isAvailable = true;
      ewdQ.sendMgrMessage({type: 'pidUpdate', pid: pid, noOfRequests: ewdQ.requestsByProcess[pid], available: ewdQ.process[pid].isAvailable});
    }
  },
  setProcessUnavailable: function(pid) {
    if (typeof ewdQ.process[pid] !== 'undefined') {
      ewdQ.process[pid].isAvailable = false;
      ewdQ.sendMgrMessage({type: 'pidUpdate', pid: pid, noOfRequests: ewdQ.requestsByProcess[pid], available: ewdQ.process[pid].isAvailable});
    }
  },
  version: function() {
    return 'ewdQ build ' + this.buildNo + ', ' + this.buildDate;
  },
  setDefault: function(propertyName, defaultValue, params) {
    ewdQ[propertyName] = defaultValue;
    if (typeof params[propertyName] !== 'undefined') ewdQ[propertyName] = params[propertyName];
  },
  setPropertyDefaults: function(property,defaults, params) {
    var name;
    ewdQ[property] = {};
    for (name in defaults[property]) {
      ewdQ[property][name] = defaults[property][name];
      if (typeof params[property] !== 'undefined') {
        if (typeof params[property][name] !== 'undefined') ewdQ[property][name] = params[property][name];
      }
    }
  },
  setDefaults: function(defaults, params, databaseParams) {
    var name;
    var value;
    for (name in defaults) {
      if (name === 'database') {
        ewdQ.setPropertyDefaults(name,defaults, params);	
      }
      else if (name === 'https') {
        ewdQ.setPropertyDefaults(name,defaults, params);	
      }
      else if (name === 'webSockets') {
        ewdQ.setPropertyDefaults(name,defaults, params);	
      }
      else if (name === 'management') {
        ewdQ.setPropertyDefaults(name,defaults, params);	
      }
      else {
        ewdQ.setDefault(name, defaults[name], params);
      }
    }
  },
  addToQueue: function(requestObj, responseHandler) {
    // puts a request onto the queue and triggers the queue to be processed
    var action = requestObj.action;
    action.logTo = ewdQ.logTo;
    action.logFile = ewdQ.logFile;
    var queuedRequest = {
      action: action,
      requestObj: requestObj,
      handler: responseHandler
    };
    var requestNo = action.requestNo;
    ewdQ.queue.push(queuedRequest);
    ewdQ.totalRequests++;
    var qLength = ewdQ.queue.length;
    ewdQ.sendMgrMessage({type: 'queueInfo', qLength: qLength});
    if (qLength > ewdQ.maxQueueLength) ewdQ.maxQueueLength = qLength;
    ewdQ.log("Request " + requestNo + " added to Queue: queue length = " + qLength + "; requestNo = " + ewdQ.totalRequests + "; after " + ewdQ.elapsedTime() + " sec", 1);
    // trigger the processing of the queue
    ewdQ.queueEvent.emit("processQueue");
    queuedRequest = null;
    action = null;
    requestObj = null;
    responseHandler = null;
  },
  
  memoryUsed: function() {
    var mem = process.memoryUsage();
    var rss = (mem.rss /1024 /1024).toFixed(2);
    var heapTotal = (mem.heapTotal /1024 /1024).toFixed(2);
    var heapUsed = (mem.heapUsed /1024 /1024).toFixed(2);
    ewdQ.sendMgrMessage({type: 'memory', rss: rss, heapTotal: heapTotal, heapUsed: heapUsed, interval: ewdQ.monitorInterval});
    return "rss: " + rss + "Mb; heapTotal: " + heapTotal + "Mb; heapUsed: " + heapUsed + "Mb";
    mem = null;
  },

  getChildProcess: function() {
    var pid;
    // try to find a free child process, otherwise return false
    for (pid in ewdQ.process) {
      if (ewdQ.process[pid].isAvailable) {
        ewdQ.process[pid].isAvailable = false;
        ewdQ.sendMgrMessage({type: 'pidUpdate', pid: pid, noOfRequests: ewdQ.requestsByProcess[pid], available: ewdQ.process[pid].isAvailable});
        return pid;
      }
    }
    return false;
  },

  getChildProcesses: function() {
    var pid;
    var pids = [];
    for (pid in ewdQ.process) {
      pids.push({pid: pid, available: ewdQ.process[pid].isAvailable, noOfRequests: ewdQ.requestsByProcess[pid]})
    }
    return pids;
  },

  startChildProcesses: function(callback) {
    var childProcess;
    var pid;
    var noStarted = 0;
    var hNow = ewdQ.hSeconds();
    ewdQ.hNow = hNow;
	
    //var arg = [ewdQ.ewdQPath, ewdQ.database.type, ewdQ.database.nodePath, ewdQ.database.path, ewdQ.database.username, ewdQ.database.password, ewdQ.database.namespace, ewdQ.traceLevel, ewdQ.logTo, ewdQ.logFile, ewdQ.startTime, ewdQ.database.outputFilePath];
    var arg = [ewdQ.ewdQPath];
    ewdQ.log("ewdQ: args: " + JSON.stringify(arg), 3);
    for (var i = 0; i < this.poolSize; i++) {
      childProcess = cp.fork(ewdQ.childProcessPath, arg, {env: process.env});
      pid = childProcess.pid;
      ewdQ.process[pid] = childProcess;
      ewdQ.process[pid].isAvailable = false;
      ewdQ.process[pid].started = false;
      ewdQ.requestsByProcess[pid] = 0;

     // define how responses from child processes are handled
     // *****************************************************

      ewdQ.process[pid].on('message', function(response) {
        ewdQ.log("child process " + response.ok + " returned response " + JSON.stringify(response), 3);
        if (response.ok) {
          if (response.type === 'exit') {
            ewdQ.sendMgrMessage({type: 'workerProcess', action: 'remove', pid: response.ok});
            ewdQ.logToBrowser('process ' + response.ok + " has been shut down");
            response = null;
            return;
          }
          ewdQ.log("Child process " + response.ok + " returned to available pool", 3);
          if ((typeof ewdQ.process[response.ok] !== 'undefined')&&(!ewdQ.process[response.ok].started)) {

            noStarted++;
            ewdQ.process[response.ok].started = true;

            // send initial working parameters to newly-started child process

            var requestObj = {
              type:'initialise',
              params: {
                httpPort: ewdQ.httpPort,
                database: ewdQ.database,
                webSockets: ewdQ.webSockets,
                ewdQPath: ewdQ.ewdQPath,
                ewdGlobalsPath: ewdQ.ewdGlobalsPath,
                traceLevel: ewdQ.traceLevel,
                logTo: ewdQ.logTo,
                logFile: ewdQ.logFile,
                startTime: ewdQ.startTime,
                https: ewdQ.https,
                httpPort: ewdQ.httpPort,
                lite: ewdQ.lite,
                webServerRootPath: ewdQ.webServerRootPath,
                management: ewdQ.management,
                no: noStarted,
                hNow: hNow,
				modulePath: ewdQ.modulePath
              }
            };
            ewdQ.log("sending initialise to " + response.ok, 3);
            ewdQ.process[response.ok].send(requestObj);

            // release the child process back to the available pool
            ewdQ.process[response.ok].isAvailable = true;
            if (noStarted === ewdQ.poolSize) {
              ewdQ.started = true;
              ewdQ.log('Memory usage after startup: ' + ewdQ.memoryUsed(), 2);
              ewdQ.log("ewdQ is ready!", 1);
              ewdQ.queueEvent.emit("processQueue");
              callback();
            }
            requestObj = null;
          }
          else {
            if (response.type === 'log') {
              ewdQ.logToBrowser('process ' + response.ok + ": " + response.message);
            }
            else if (response.type === 'mgrMessage') {
              ewdQ.sendMgrMessage(response.message);
            }
            else if (response.type === 'wsMessage') {
              ewdQ.sendWebSocketMsg(response);
            }
            else {
              ewdQ.handleResponse(response);
            }
          }
          response = null;
        }
      });
    }
  },
	  
  startChildProcess: function() {
    //console.log("starting child process!");
    var childProcess;
    var pid;
    //var arg = [ewdQ.ewdQPath, ewdQ.database.type, ewdQ.database.nodePath, ewdQ.database.path, ewdQ.database.username, ewdQ.database.password, ewdQ.database.namespace, ewdQ.traceLevel, ewdQ.logTo, "", ewdQ.startTime, ewdQ.database.outputFilePath, ewdQ.lite];
    var arg = [ewdQ.ewdQPath];
    childProcess = cp.fork(ewdQ.childProcessPath, arg);
    pid = childProcess.pid;
    ewdQ.process[pid] = childProcess;
    ewdQ.process[pid].isAvailable = false;
    ewdQ.process[pid].started = false;
    ewdQ.requestsByProcess[pid] = 0;

    // define how responses from child processes are handled
    // *****************************************************

    ewdQ.process[pid].on('message', function(response) {
      ewdQ.log("child process returned response " + JSON.stringify(response), 3);
      if (response.ok) {
        if (response.type === 'exit') {
          ewdQ.sendMgrMessage({type: 'workerProcess', action: 'remove', pid: response.ok});
          ewdQ.logToBrowser('process ' + response.ok + " has been shut down");
          response = null;
          return;
        }
        ewdQ.log("Child process " + response.ok + " returned to available pool", 2);
        if ((typeof ewdQ.process[response.ok] !== 'undefined')&&(!ewdQ.process[response.ok].started)) {
          ewdQ.process[response.ok].started = true;

          var requestObj = {
            type:'initialise',
            params: {
              httpPort: ewdQ.httpPort,
              database: ewdQ.database,
              webSockets: ewdQ.webSockets,
              ewdQPath: ewdQ.ewdQPath,
              ewdGlobalsPath: ewdQ.ewdGlobalsPath,
              traceLevel: ewdQ.traceLevel,
              logTo: ewdQ.logTo,
              logFile: ewdQ.logFile,
              startTime: ewdQ.startTime,
              https: ewdQ.https,
              httpPort: ewdQ.httpPort,
			  lite: ewdQ.lite,
              webServerRootPath: ewdQ.webServerRootPath,
              management: ewdQ.management,
              no: 999,
              hNow: ewdQ.hNow,
			  modulePath: ewdQ.modulePath
            }			
          };
          ewdQ.log("sending initialise to " + response.ok, 3);
          ewdQ.process[response.ok].send(requestObj);

          // release the child process back to the available pool
          ewdQ.process[response.ok].isAvailable = true;
          requestObj = null;
        }
        else {
          if (response.type === 'log') {
            ewdQ.logToBrowser('process ' + response.ok + ": " + response.message);
          }
          else if (response.type === 'mgrMessage') {
            ewdQ.sendMgrMessage(response.message);
          }
          else if (response.type === 'wsMessage') {
            ewdQ.sendWebSocketMsg(response);
          }
          else {
            ewdQ.handleResponse(response);
          }
        }
        response = null;
      }
    });
    return pid;
  },
  
  handleResponse: function(response) {
    // do whatever the master process needs to do with the child 
    // process's response by invoking the handler
    var childProcess = ewdQ.process[response.ok];
    var handler = childProcess.handler;
    var requestObj = childProcess.queuedRequest;
    if (typeof handler !== 'undefined') {
      ewdQ.log("running handler", 2);
      handler(requestObj, response.response);
      ewdQ.log("ewdQ completed handling response at " + ewdQ.elapsedTime(), 2);
      childProcess = null;
      handler = null;
      requestObj = null;
    }
    // release the child process back to the available pool
    ewdQ.process[response.ok].isAvailable = true;
    ewdQ.sendMgrMessage({type: 'pidUpdate', pid: response.ok, noOfRequests: ewdQ.requestsByProcess[response.ok], available: ewdQ.process[response.ok].isAvailable});
    // now that it's available again, trigger the queue to be processed
    ewdQ.queueEvent.emit("processQueue");
    response = null;
  },
  
  processQueue: function() {
    // tries to allocate queued actions to available child processes
    if (ewdQ.queue.length > 0)  {
      ewdQ.queueEvents++;
      ewdQ.log("processing queue: " + ewdQ.queueEvents + "; queue length " + ewdQ.queue.length + "; after " + ewdQ.elapsedTime() + " seconds", 1);
      var queuedRequest;
      var pid;

      // first pass - handle requests for specific child processes

      var unprocessed = [];
      for (var i = 0; i < ewdQ.queue.length; i++) {
        queuedRequest = ewdQ.queue[i];
        if (typeof queuedRequest.action.usePid !== 'undefined') {
          pid = queuedRequest.action.usePid;
          console.log("usePid = " + pid);
          if (ewdQ.process[pid]) {
            console.log("checking if " + pid + " is available");
            if (ewdQ.process[pid].isAvailable) {
              console.log("yes, " + pid + " is available");
              ewdQ.process[pid].isAvailable = false;
              // process queued request
              ewdQ.log("pid-specifying queuedRequest = " + JSON.stringify(queuedRequest), 3);
              var requestNo = queuedRequest.action.requestNo;
              ewdQ.log("dispatching request " + requestNo + " to " + pid + "at " + ewdQ.elapsedTime(), 1);
              childProcess = ewdQ.process[pid];
              childProcess.queuedRequest = queuedRequest.requestObj;
              childProcess.handler = queuedRequest.handler;
              queuedRequest.childProcess = pid;

              // ***** pass request to child process ****

              childProcess.send(queuedRequest.action);
		  
              // ****************************************

              // increment usage stats
              ewdQ.connectionUpdate = true;
              ewdQ.requestsByProcess[pid]++;
              ewdQ.sendMgrMessage({type: 'pidUpdate', pid: pid, noOfRequests: ewdQ.requestsByProcess[pid], available: ewdQ.process[pid].isAvailable});

              if (queuedRequest.action.exit) {
                delete ewdQ.process[pid];
                delete ewdQ.requestsByProcess[pid];
                ewdQ.log("clearing down arrays for " + pid, 2);
              }
            }
            else {
              // push onto unused queue
              unprocessed.push(queuedRequest);
              ewdQ.log("Queued request needed pid " + pid + " but child process was busy: pushed onto unprocessed queue", 1)
            }
          }
          // remove from main queue
          ewdQ.queue.splice(i, 1);
          ewdQ.log("Queued request for pid " + pid + " removed from main queue", 1);
        }
      }
      // now process all other requests
      pid = true;
      var childProcess;
      if (ewdQ.queue.length === 0) pid = false;
      while (pid) {
        pid = ewdQ.getChildProcess();
        if (pid) {
          // A free child process was found, so
          // dispatch action to it
          queuedRequest = ewdQ.queue.shift();
          ewdQ.sendMgrMessage({type: 'queueInfo', qLength: ewdQ.queue.length});
          ewdQ.log("queuedRequest = " + JSON.stringify(queuedRequest), 3);
          var requestNo = queuedRequest.action.requestNo;
          ewdQ.log("dispatching request " + requestNo + " to " + pid + "at " + ewdQ.elapsedTime(), 1);
          childProcess = ewdQ.process[pid];
          childProcess.queuedRequest = queuedRequest.requestObj;
          childProcess.handler = queuedRequest.handler;
          queuedRequest.childProcess = pid;

          // ***** pass request to child process ****

          childProcess.send(queuedRequest.action);
		  
          // ****************************************

          // increment usage stats
          ewdQ.connectionUpdate = true;
          ewdQ.requestsByProcess[pid]++;
          ewdQ.sendMgrMessage({type: 'pidUpdate', pid: pid, noOfRequests: ewdQ.requestsByProcess[pid], available: ewdQ.process[pid].isAvailable});

          if (queuedRequest.action.exit) {
            delete ewdQ.process[pid];
            delete ewdQ.requestsByProcess[pid];
            ewdQ.log("clearing down arrays for " + pid, 2);
          }
        }
        if (ewdQ.queue.length === 0) {
          pid = false;
          ewdQ.log("queue exhausted", 2);
        }
      }
      childProcess = null;
      queuedRequest = null;
      if (ewdQ.queue.length > 0) {
        ewdQ.log("queue processing aborted: no free child proceses available", 2);
      }
      // put any unprocessed pid-specific requests back onto the main queue, ready for next attempt
      if (unprocessed.length > 0) {
        for (i = 0; i < unprocessed.length; i++) {
          ewdQ.queue.push(unprocessed[i]);
        }
      }
    }
  },
  elapsedTime: function() {
    var now = new Date().getTime();
    return (now - ewdQ.startTime)/1000;
  },

  traverseJSON: function(obj, subscripts, func) {
    var i;
    var j;
    if (typeof subscripts === 'undefined') subscripts = [];
    for (i in obj){
      subscripts.push(i);
      if (obj[i] instanceof Array) {
        for (j = 0; j < obj[i].length; j++) {
          subscripts.push(j);
          func.apply(this, [subscripts, obj[i][j]]);
          subscripts.pop();
        }
      }
      if (typeof obj[i] !== 'object') func.apply(this,[subscripts, obj[i]]);      
      if (obj[i] instanceof Object && !(obj[i] instanceof Array)) {
        ewdQ.traverseJSON(obj[i], subscripts, func);
      }
      subscripts.pop();
    }
  },
  log: function(message, level, clearLog) {
    if (level <= ewdQ.traceLevel) {
      if (ewdQ.logTo === 'console') {
        console.log(message);
      }
      if (ewdQ.logTo === 'global') {
        ewdQ.logToGlobal(message);
      }
      if (ewdQ.logTo === 'file') {
        ewdQ.logToFile(message, clearLog);
      }
      ewdQ.logToBrowser(message);
    }
    message = null;
    level = null;
  },
  logToGlobal: function(message) {
    var logMessage = message;
    var gloRef = {global: ewdGateway.logGlobal, subscripts: []};
    ewdQ.queueCommand('increment', gloRef, function(error, results) {
      var index = results.value;
      var gloRef = {global: ewdGateway.logGlobal, subscripts: [index], value: logMessage};
      ewdQ.queueCommand('set', gloRef, function(error, results) {
      });
    });
  },
  logToFile: function(message, clearLog) {
    var logpath = ewdQ.logFile;
    var s = new Date().getTime() + ': ' + process.pid + ': ' + message.toString().replace(/\r\n|\r/g, '\n'); // hack
    var flag = 'a+';
    if (clearLog) flag = 'w+';
    var fd = fs.openSync(logpath, flag, 0666);
    fs.writeSync(fd, s + '\r\n');
    fs.closeSync(fd);
  },

  sendWebSocketMsg: function(obj) {
    if (typeof ewdQ.socketClientByToken[obj.token] !== 'undefined') {
      var client = ewdQ.socketClientByToken[obj.token];
      client.json.send(obj.content);
    }
    client = null;
    obj = null;
  },
  
  stopChildProcess: function() {
    var requestObj = {
      action: {
        exit: true,
        requestNo: 'exit'
      }
    };
    ewdQ.addToQueue(requestObj,  function(requestObj, results) {
      console.log("stopChildProcess - addToQueue callback back in ewdQ - results = " + JSON.stringify(results));
      requestObj = null;
      results = null;
    });
    requestObj = null;
  },

  defaults: {
    childProcessPath: __dirname + '/ewdQWorker.js',
    database: {
      type: 'cache',
      nodePath: "c:\\Program Files\\nodejs\\cache",
      outputFilePath: "c:\\temp",
      path:"c:\\InterSystems\\Cache\\Mgr",
      username: "_SYSTEM",
      password: "SYS",
      namespace: "USER"
    },
    lite: false,
    ewdPath: '/ewd/',
    ewdQPath: './ewdQ',
    ewdGlobalsPath: './ewdGlobals',
    httpPort: 8080,
    https: {
      enabled: false,
      keyPath: __dirname + "/ssl/ssl.key",
      certificatePath: __dirname + "/ssl/ssl.crt",
      useProxy: false,
      proxyPort: 89,
	  httpPort: 8082
    },
	modulePath: '/var/ewd_modules',
    webSockets: {
      enabled: false,
      path: '/ewdWebSocket/',
      socketIoPath: '/usr/lib/node_modules/socket.io',
    },
    logFile: 'ewdLog.txt',
    logTo: 'console',
    monitorInterval: 30000,
    poolSize: 2,
    silentStart: false,
    traceLevel: 1,
    webServerRootPath: '/var/www',
    management: {
      path: '/ewdGatewayMgr',
      password: 'makeSureYouChangeThis!'
    }
  },
  
  maxQueueLength: 0,
  process: {},
  queue: [],
  queueEvent: new events.EventEmitter(),
  queueEvents: 0,
  requestsByProcess: {},

  started: false,
  totalRequests: 0

};


module.exports = {
  start: function(params, callback) {

    // define parameters / set defaults
    ewdQ.startTime = params.startTime;
    ewdQ.logToBrowser = params.logToBrowser;
    ewdQ.sendMgrMessage = params.sendMgrMessage;
    //ewdQ.socketClient = params.socketClient;
    ewdQ.socketClientByToken = params.socketClientByToken;
    ewdQ.setDefaults(ewdQ.defaults, params);
    if (typeof params.management.password !== 'undefined') {
      ewdQ.management.password = params.management.password;
    }
    ewdQ.queueEvent.on("processQueue", ewdQ.processQueue);
    var requestNo = 0;

    var stats = function() {
      process.nextTick(function memory() {
        ewdQ.queueEvent.emit("processQueue");
        // report connection stats if they've changed
        var pid;
        var mem;
        if (ewdQ.traceLevel > 0) {
          mem = ewdQ.memoryUsed();
          /*
          ewdQ.log("\r\newdGateway status at " + new Date().toUTCString() + ":", 1);
          ewdQ.log("Connection Pool Size: " + ewdQ.poolSize, 1);
          ewdQ.log('Memory usage: ' + mem, 1);
          ewdQ.log("Monitor Interval = " + ewdQ.monitorInterval, 1);
          if (ewdQ.connectionUpdate) {
            ewdQ.log("Child Process utilisation:", 1);
            for (pid in ewdQ.requestsByProcess) {
              ewdQ.log(pid + ": " + ewdQ.requestsByProcess[pid], 1);
            }
            ewdQ.log("Max queue length: " + ewdQ.maxQueueLength, 1);
            ewdQ.connectionUpdate = false;
            ewdQ.maxQueueLength = 0;
          }
          */
          ewdQ.maxQueueLength = 0;
        }
        //pid = null;
        mem = null;
        setTimeout(stats, ewdQ.monitorInterval);
      });
    };

    setTimeout(stats, ewdQ.monitorInterval);
	
    //if (!ewdQ.silentStart) {
      ewdQ.log("********************************************", 1);
      ewdQ.log("*** ewdQ Build " + ewdQ.buildNo + " (" + ewdQ.buildDate + ") ***", 1);
      ewdQ.log("********************************************", 1);
      ewdQ.log(ewdQ.poolSize + " child Node processes running", 1);
      if (ewdQ.trace) {
        ewdQ.log("Trace mode is on", 1);
      }
      else {
        ewdQ.log("Trace mode is off", 1);
      }
    //}

    // start it up and drop into callback
    ewdQ.startChildProcesses(callback);
  },

  addToQueue: ewdQ.addToQueue,
  setMonitorInterval: ewdQ.setMonitorInterval,
  setTraceLevel: ewdQ.setTraceLevel,
  setPoolSize: ewdQ.setPoolSize,
  setLogTo: ewdQ.setLogTo,
  setLogFile: ewdQ.setLogFile,
  traverseJSON: ewdQ.traverseJSON,
  startChildProcess: ewdQ.startChildProcess,
  stopChildProcess: ewdQ.stopChildProcess,
  getChildProcesses: ewdQ.getChildProcesses,
  setProcessAvailable: ewdQ.setProcessAvailable,
  setProcessUnavailable: ewdQ.setProcessUnavailable,
  build: ewdQ.buildNo + " (" + ewdQ.buildDate + ")",
  modulePath: ewdQ.modulePath,
 
  childProcess: {
    handler: function(actionMethod) {
      process.on('message', function(action) {
        //console.log("***Child process " + process.pid + " received message: " + JSON.stringify(action));
        var response = '';
        if (typeof actionMethod !== 'undefined') response = actionMethod(action);
        if (action.exit) {
          process.send({ok: process.pid, type: 'exit'});
        }
        else {
          if (action.type !== 'initialise') process.send({ok: process.pid, response: response});
        }
        response = null;
        action = null;
      });

      //console.log("Child process " + process.pid + " has started");

      process.send({ok: process.pid});
    }
  }
};
