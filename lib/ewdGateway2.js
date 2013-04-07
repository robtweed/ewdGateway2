/*

 ----------------------------------------------------------------------------
 | ewdGateway2: Node.js-based EWD gateway for GT.M & Cache                  |
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

*/

var fs = require("fs");
var http = require('http');
var url = require("url");
var queryString = require("querystring");
var path = require("path"); 
var events = require("events");
//var util = require('util');
//var v8p = require("v8-profiler");
 
var ewdGateway = {
  buildNo: 37,
  buildDate: "11 March 2013",
  version: function() {
    return 'ewdGateway build ' + this.buildNo + ', ' + this.buildDate;
  },
  startTime: new Date().getTime(),
  elapsedTime: function() {
    var now = new Date().getTime();
    return (now - this.startTime)/1000;
  },
  socketClient: {},
  socketClientByToken: {},
  setDefault: function(propertyName, defaultValue, params) {
    ewdGateway[propertyName] = defaultValue;
    if (typeof params[propertyName] !== 'undefined') ewdGateway[propertyName] = params[propertyName];
  },
  setPropertyDefaults: function(property,defaults, params) {
    var name;
    ewdGateway[property] = {};
    for (name in defaults[property]) {
      ewdGateway[property][name] = defaults[property][name];
      if (typeof params[property] !== 'undefined') {
        if (typeof params[property][name] !== 'undefined') ewdGateway[property][name] = params[property][name];
      }
    }
  },
  setDefaults: function(defaults, params, databaseParams) {
    var name;
    var value;
    for (name in defaults) {
      if (name === 'database') {
        ewdGateway.setPropertyDefaults(name,defaults, params);	
      }
      else if (name === 'https') {
        ewdGateway.setPropertyDefaults(name,defaults, params);	
      }
      else if (name === 'webSockets') {
        ewdGateway.setPropertyDefaults(name,defaults, params);	
      }
      else if (name === 'management') {
        ewdGateway.setPropertyDefaults(name,defaults, params);	
      }
      else {
        ewdGateway.setDefault(name, defaults[name], params);
      }
    }
  },
  log: function(message, level, clearLog) {
    if (level <= ewdGateway.traceLevel) {
      if (ewdGateway.logTo === 'console') {
        console.log(message);
      }
      if (ewdGateway.logTo === 'global') {
        ewdGateway.logToGlobal(message);
      }
      if (ewdGateway.logTo === 'file') {
        ewdGateway.logToFile(message, clearLog);
      }
      ewdGateway.logToBrowser(message);
      message = null;
    }	  
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
    var logpath = ewdGateway.logFile;
    var s = new Date().getTime() + ': ' + process.pid + ': ' + message.toString().replace(/\r\n|\r/g, '\n'); // hack
    var flag = 'a+';
    if (clearLog) flag = 'w+';
    var fd = fs.openSync(logpath, flag, 0666);
    fs.writeSync(fd, s + '\r\n');
    fs.closeSync(fd);
  },
  logToBrowser: function(message) {
    ewdGateway.browserLogger.emit('send',{type: 'consoleText', text: message});
  },
  sendMgrMessage: function(message) {
    ewdGateway.browserLogger.emit('send', message);
  },
  sendMsgToMgr: function(message) {
    var clientId;
    var socketClient;
    var token;
    var client;
    for (clientId in ewdGateway.socketClient) {
      socketClient = ewdGateway.socketClient[clientId];
      if ((socketClient.connected)&&(socketClient.monitoring)) {
        token = socketClient.token;
        client = ewdGateway.socketClientByToken[token];
        client.json.send(message);
      }
    }
    socketClient = null;
    client = null;
    clientId = null;
    token = null;
    message = null;
  },
  messageHandler: {},
  browserLogger: new events.EventEmitter()
}; 

if (process.version.indexOf('0.6') !== -1) {
  ewdGateway.exists = path.exists;
}
else {
  ewdGateway.exists = fs.exists;
}

module.exports = {
  start: function(params, callback) {

   ewdGateway.browserLogger.on("send", function(message) {
     ewdGateway.sendMsgToMgr(message);
    });

    var defaults = {
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
      ewdPath: '/ewd/',
      ewdQPath: './ewdQ',
      ewdGlobalsPath: './ewdGlobals',
      onBeforeRenderPath: '/onBeforeRender/',
      httpPort: 8080,
      https: {
        enabled: false,
        keyPath: __dirname + "/ssl/ssl.key",
        certificatePath: __dirname + "/ssl/ssl.crt",
        useProxy: false,
        proxyPort: 89,
		httpPort: 8082
      },
      webSockets: {
        enabled: false,
        path: '/ewdWebSocket/',
        socketIoPath: 'socket.io',
      },
      logFile: 'ewdLog.txt',
      logTo: 'console',
      logHTTP: true,
      monitorInterval: 30000,
      poolSize: 2,
      silentStart: false,
      traceLevel: 1,
      webServerRootPath: '/var/www',
      management: {
        path: '/ewdGatewayMgr'
      }
    };
    ewdGateway.setDefaults(defaults, params);
    if (ewdGateway.logTo === 'file') ewdGateway.log("Log file started", ewdGateway.traceLevel, true);
    if (typeof params.management.password !== 'undefined') {
      ewdGateway.management.password = params.management.password;
    }

    //if (!ewdGateway.silentStart) {
      ewdGateway.log("********************************************", 1);
      ewdGateway.log("*** ewdGateway Build " + ewdGateway.buildNo + " (" + ewdGateway.buildDate + ") ***", 1);
      ewdGateway.log("********************************************", 1);
    //}
	
    var ewdQ = require(ewdGateway.ewdQPath);
    ewdGateway.log("ewdGateway.database = " + JSON.stringify(ewdGateway.database), 3);

    var params = {
      callback: callback,
      childProcessPath: ewdGateway.childProcessPath,
      database: ewdGateway.database,
      https: ewdGateway.https,
      webSockets: ewdGateway.webSockets,
      management: ewdGateway.management,
      ewdQPath: ewdGateway.ewdQPath,
      ewdGlobalsPath: ewdGateway.ewdGlobalsPath,
      logFile: ewdGateway.logFile,
      logTo: ewdGateway.logTo,
      monitorInterval: ewdGateway.monitorInterval,
      poolSize: ewdGateway.poolSize,
      silentStart: ewdGateway.silentStart,
      traceLevel: ewdGateway.traceLevel,
      startTime: ewdGateway.startTime,
      httpPort: ewdGateway.httpPort,
      logToBrowser: ewdGateway.logToBrowser,
      sendMgrMessage: ewdGateway.sendMgrMessage
    };

    ewdQ.start(params, function() {
      var emitters = {};
      var requestNo = 0;

      var httpLogger = function(request, responseCode) {
        var requestObj = {
          action: {
            type: 'logHTTP', 
            timeStamp: new Date().getTime(),
            time: new Date().toUTCString(),
            headers: request.headers,
            url: request.url,
            method: request.method,
            httpVersion: request.httpVersion,
            remoteAddr: request.connection.remoteAddress,
            responseCode: responseCode,
            requestNo: 'logHTTP',
          }
        };
        ewdQ.addToQueue(requestObj, function() {});
      };
       
      var responseHandler = function(requestObj, results) {
        ewdGateway.log("action: " + JSON.stringify(requestObj.action), 3);
        ewdGateway.log("results = " + JSON.stringify(results), 3);
        ewdGateway.log("requestNo = " + requestObj.action.requestNo, 2);
        var emitter = emitters[requestObj.action.requestNo];
        delete emitters[requestObj.action.requestNo];
        emitter.emit("ready",results);
        requestObj = null;
        results = null;
        emitter = null;
      };
      
      var display404 = function(response) {
        response.writeHead(404, {"Content-Type" : "text/plain" });  
        response.write("404 Not Found \n");  
        response.end();  
      };   
      
	  // Main web server call-back function
	  
      var webserverCallback = function(request, response) {
        /*
          SJC: Added following check for multi-part forms, if a formHandler has been registered then use that.
          Avoids potentially multi-megabyte file uploads being collected in the request.content field.
          If the custom formHandler doesn't want to handle the form, then it should return boolean false,
          otherwise return a boolean true value.
        */
	    if ((request.method.toLowerCase() === 'post')&&(request.headers['content-type'])&&(request.headers['content-type'].substring(0,20) === 'multipart/form-data;')&&(typeof ewdGateway.formHandler === 'function')&&(ewdGateway.formHandler(request,response))) {
          return;
        }
        var content = '';
        request.on("data", function(chunk) {
          content += chunk;
        });
	  
        request.once("end", function(){
          var postedData = queryString.parse(content);
          var contentType;
          var urlObj = url.parse(request.url, true); 
          var uri = urlObj.pathname;
          if (uri === '/favicon.ico') {
            display404(response);
            uri = null;
            urlObj = null;
            return;
          }
          ewdGateway.log("uri: " + uri, 3);
          ewdGateway.log("postedData = " + JSON.stringify(postedData), 3);

          if (uri.substring(0,ewdGateway.onBeforeRenderPath.length)===ewdGateway.onBeforeRenderPath) {
            /*		    
              incoming request from GT.M / Cache to invoke a Javascript pre-page script
              eg example URL /onBeforeRender/request.html?module=myModule&method=initialise&token=hkjhkjhkhjkjkhjk
              token is used to identify the sessid
              
              the method should return null string or an error string

              package up the message as an object and put into queue for worker to process
            */

            var onBeforeRenderResponse = new events.EventEmitter();
            //ewdGateway.request = request;
            onBeforeRenderResponse.once("ready", function(results) {
              // response from onBeforeRender method is ready for output to browser
              ewdGateway.log("onBeforeRenderResponse event triggered - results = " + JSON.stringify(results), 2);
              response.writeHead(200, {'Content-Type': 'text/plain'});
              response.write(results + "\r\n");
              response.end();
              //if (ewdGateway.logHTTP) httpLogger(ewdGateway.request, 200);
              onBeforeRenderResponse = null;
              headers = null;
              requestObj = null;
              urlObj = null;
              uri = null;
            });
              
            requestNo++;
            emitters[requestNo] = onBeforeRenderResponse;

            var requestObj = {
              action: {
                type:'onBeforeRender',
                appName: postedData.appName,
                module: postedData.module,
                method: postedData.method,
                reload: postedData.reload,
                token: postedData.token,
                traceLevel: ewdGateway.traceLevel,
                requestNo: requestNo,
                pids: ewdQ.getChildProcesses()
              }
            };
            ewdQ.addToQueue(requestObj, responseHandler);
            return;
          }

          /*
           SJC: Changed the following 'if' statement to ensure that only requests that should be handled by EWD
            are sent to the database, anything else that happens to share the same path will then fall through
            this check.
            Extensions other than 'ewd' and 'mgwsi' are not checked for. 
          */
          
          if (uri.substring(0,ewdGateway.webSockets.path.length)===ewdGateway.webSockets.path) {
            /*		    
              incoming websocket request from GT.M / Cache
              eg example URL /ewdWebSocket?message=xxxxxxxx&token=hkjhkjhkhjkjkhjk  &broadcast=true
              token is used to identify the registered browser for whom this message is destined
              if broadcast=true, then sent message to all registered browsers
            */
            var client;
            var wsResponse;
            ewdGateway.log("incoming websocket request URL", 1);
            //ewdGateway.log("query: " + JSON.stringify(urlObj.query), 1);
            ewdGateway.log("postedData = " + JSON.stringify(postedData),1);
            if (typeof ewdGateway.socketClientByToken[postedData.token] !== 'undefined') {
              response.writeHead(200, {'Content-Type': 'text/plain'});
              response.end("ok\n");
              client = ewdGateway.socketClientByToken[postedData.token];
              wsResponse = {type: postedData.type};
              if (typeof postedData.message !== 'undefined') wsResponse.message = postedData.message;
              if (typeof postedData.json !== 'undefined') wsResponse.json = JSON.parse(postedData.json);
              if (typeof postedData.content !== 'undefined') wsResponse.content = postedData.content;
              if (typeof postedData.targetId !== 'undefined') wsResponse.targetId = postedData.targetId;
              if (typeof postedData.return !== 'undefined') wsResponse.return = postedData.return;
              client.json.send(wsResponse);
              request.headers['user-agent'] = ewdGateway.database.type;
              if (ewdGateway.logHTTP) httpLogger(request, 200);
            }
            else {
              display404(response);
              if (ewdGateway.logHTTP) httpLogger(request, 404);
            }
            client = null;
            wsResponse = null;
            urlObj = null;
            uri = null;
            return;			 
          }

          if (uri.substring(0,ewdGateway.management.path.length)===ewdGateway.management.path) {
            /*		    
              incoming management request from GT.M / Cache
              eg example URL /ewdGatewayManager?password=xxxxxxxx&task=value

              tasks:  addProcess (true),
                      closeProcess (true),
                      traceLevel (level)
                      logTo (device)
                      clearLog (true)
                      monitorInterval (value)
                      listChildProcesses (true)
                      disableProcess (pid)

              password must match that defined in startup module
            */
            ewdGateway.log("incoming management request URL", 1);
            ewdGateway.log("postedData = " + JSON.stringify(postedData),2);
            if (typeof postedData.password !== 'undefined') {
              if (postedData.password === ewdGateway.management.password) {
                response.writeHead(200, {'Content-Type': 'text/plain'});
                response.end("ok\n");

                if (typeof postedData.poolSize !== 'undefined') {
                  // reset poolsize
                  ewdGateway.log("reset poolsize to " + postedData.poolSize, 1);
                  if ((postedData.poolSize > 0)&&(postedData.poolSize < 100)) {
                    if (postedData.poolSize > ewdGateway.poolSize) {
                      var no = postedData.poolSize - ewdGateway.poolSize;
                      ewdGateway.log("increasing poolsize by " + no, 2);
                      for (var i=0; i < no; i++) {
                        ewdQ.startChildProcess();
                      }
                      ewdGateway.poolSize = postedData.poolSize;
                      ewdQ.setPoolSize(postedData.poolSize);
                    }
                    if (postedData.poolSize < ewdGateway.poolSize) {
                      var no = ewdGateway.poolSize - postedData.poolSize;
                      ewdGateway.log("decreasing poolsize by " + no, 2);
                      for (var i=0; i < no; i++) {
                        ewdQ.stopChildProcess();
                      }
                      ewdGateway.poolSize = postedData.poolSize;
                      ewdQ.setPoolSize(postedData.poolSize);
                    }
                  }
                }

                if (typeof postedData.traceLevel !== 'undefined') {
                  // reset traceLevel
                  ewdGateway.log("trace level to be reset to " + postedData.traceLevel, 1);
                  ewdGateway.traceLevel = postedData.traceLevel;
                  ewdQ.setTraceLevel(postedData.traceLevel);
                  if (postedData.traceLevel > 0) ewdGateway.io.set('log level', 1);
                }
                if (typeof postedData.monitorInterval !== 'undefined') {
                  // reset monitorInterval
                  ewdGateway.log("monitorInterval to be reset to " + postedData.monitorInterval, 1);
                  ewdQ.setMonitorInterval(postedData.monitorInterval); 
                }
                if (typeof postedData.disableProcess !== 'undefined') {
                  // make a child process unavailable
                  ewdGateway.log("disabling process " + postedData.disableProcess, 1);
                  ewdQ.setProcessUnavailable(postedData.disableProcess);
                  var pids = ewdQ.getChildProcesses();
                  ewdGateway.log("Child processes: " + JSON.stringify(pids), 1);
                }
                if (typeof postedData.enableProcess !== 'undefined') {
                  // make a child process available
                  ewdGateway.log("enabling process " + postedData.enableProcess, 1);
                  ewdQ.setProcessAvailable(postedData.enableProcess);
                  var pids = ewdQ.getChildProcesses();
                  ewdGateway.log("Child processes: " + JSON.stringify(pids), 1);
                }
                if (typeof postedData.listChildProcesses !== 'undefined') {
                  // list child processes
                  var pids = ewdQ.getChildProcesses();
                  ewdGateway.log("Child processes: " + JSON.stringify(pids), 1);
                }
                if (typeof postedData.logTo !== 'undefined') {
                  // reset logging device
                  ewdGateway.log("logging device to be reset to " + postedData.logTo, 1);
                  if ((postedData.logTo === 'console')||(postedData.logTo === 'file')||(postedData.logTo === 'global')) {
                    ewdGateway.logTo = postedData.logTo;
                    ewdQ.setLogTo(postedData.logTo);
                    if (postedData.logTo === 'file') ewdGateway.log('ewdGateway Log started', ewdGateway.traceLevel, true);
                  }
                }
                if (postedData.clearLog) {
                  // clear log file
                  ewdGateway.log('ewdGateway Log started', ewdGateway.traceLevel, true);
                }
              if (ewdGateway.logHTTP) httpLogger(request, 200);
              }
              else {
                display404(response);
              if (ewdGateway.logHTTP) httpLogger(request, 404);
              }
            }
            else {
              display404(response);
              if (ewdGateway.logHTTP) httpLogger(request, 404);
            }
            client = null;
            wsResponse = null;
            urlObj = null;
            uri = null;
            return;			 
          }
		  
          if ((uri.substring(0,ewdGateway.ewdPath.length)===ewdGateway.ewdPath)&&((uri.substring(uri.length-4)==='.ewd')||(uri.substring(uri.length-6)==='.mgwsi'))) {
            // EWD URL received
            ewdGateway.log("Request " + uri + " received at " + ewdGateway.elapsedTime(),2)
            var type="http";
            var CacheResponse = new events.EventEmitter();
            ewdGateway.request = request;
            CacheResponse.once("ready", function(results) {
              // response from Cache is ready for output to browser
              var responseCode;
              var pieces;
              var eol = "\r\n";
              if (results.substring(0,1) === "<") {
                responseCode = ['',200];
                pieces = ["HTTP/1.1 200 OK", results];
              }
              else {
                pieces = results.split(eol + eol);
                responseCode = pieces[0].split(" ");
              }
              //pieces[0] = pieces[0] + eol + "Cache-Control: public, max-age=31536000" + eol + "Expires: Mon, 25 Jun 2013 21:31:12 GMT";
              response.writeHead(responseCode[1], pieces[0]);
              for (var i = 1; i < pieces.length; i++) {
                response.write(pieces[i] + eol + eol);
              }		  
              response.end();
              if (ewdGateway.logHTTP) httpLogger(ewdGateway.request, responseCode[1]);
              CacheResponse = null;
              headers = null;
              requestObj = null;
              urlObj = null;
              uri = null;
            });
              
            requestNo++;
            emitters[requestNo] = CacheResponse;
            var headers = {
              headers: request.headers,
              server_protocol: 'HTTP/' + request.httpVersion,
              remote_Addr: request.connection.remoteAddress,
              script_name: urlObj.pathname
            };
            var requestObj = {
              action: {
                method: request.method,
                type: type, 
                query: urlObj.query, 
                headers: headers,
                content: content,
                requestNo: requestNo,
                traceLevel: ewdGateway.traceLevel
              }
            };
            ewdQ.addToQueue(requestObj, responseHandler);
          }
          /*
           SJC: Added the following 'if' statement to the 'else' to allow a custom request handler to be included,
             if this function is not defined or it returns boolean false then the existing code in the following
             else block will be executed as normal.
             If the custom request handler will handle the request then it must return boolean true. 
          */
          else if ((typeof ewdGateway.requestHandler === 'function')&&(ewdGateway.requestHandler(urlObj,request,response))) {
            return;
          }
          else {
            //*SJC: Added the 'unescape' function below to handle filenames containing spaces (%20) or other odd characters
            var fileName = unescape(ewdGateway.webServerRootPath + uri);
            ewdGateway.log("filename = " + fileName, 1);
            ewdGateway.exists(fileName, function(exists) {  
              if (!exists) {  
                display404(response); 
              if (ewdGateway.logHTTP) httpLogger(request, 404);
                urlObj = null;
                uri = null;
                fileName = null;
                return;  
              }
              else {
                fs.readFile(fileName, "binary", function(err, file) {  
                  if (err) {
                    var errCode = 500;
                    if (err.errNo === 34) errCode = 404;
                    response.writeHead(errCode, {"Content-Type": "text/plain"});  
                    response.write(err + "\n");  
                    response.end();
                    if (ewdGateway.logHTTP) httpLogger(request, errCode);
                    urlObj = null;
                    uri = null;
                    fileName = null;
                    content = null;
                    return;  
                  }
                  fs.stat(fileName,function(err, stat) {
                    var etag = stat.size + '-' + Date.parse(stat.mtime);
                    ewdGateway.log("etag = " + etag, 2);
                    if (request.headers['if-none-match'] === etag) {
                      response.setHeader('Last-Modified', stat.mtime);
                      response.statusCode = 304;
                      response.end();
                      if (ewdGateway.logHTTP) httpLogger(request, 304);
                      urlObj = null;
                      uri = null;
                      fileName = null;
                      content = null;
                      return; 
                    }
                    contentType = "text/plain";
                    if (fileName.indexOf(".htm") !== -1) contentType = "text/html";
                    if (fileName.indexOf(".js") !== -1) contentType = "application/javascript";
                    if (fileName.indexOf(".css") !== -1) contentType = "text/css";
                    if (fileName.indexOf(".jpg") !== -1) contentType = "image/jpeg";
                    var xdate = new Date();
                    var year = xdate.getFullYear() + 1;
                    xdate = xdate.setFullYear(year);
                    var expire = new Date(xdate).toUTCString();
                    var headers = {
                      "Content-Type": contentType, 
                      "Last-Modified": stat.mtime.toUTCString(), //split("GMT")[0] + "GMT"),
                      "ETag": etag,
                      "Cache-Control": 'public; max-age=31536000',
                      "Expires": expire
                    };
                    response.writeHead(200, headers);  
                    response.write(file, "binary");  
                    response.end();
                    if (ewdGateway.logHTTP) httpLogger(request, 200);
                    urlObj = null;
                    uri = null;
                    fileName = null;
                    content = null;
                  });
                }); 
              }
            });
          }
        });
      };
	  

      var wsServerCallback = function(request, response) {
	  
        var content = '';
        request.on("data", function(chunk) {
          content += chunk;
        });
	  
        request.once("end", function(){
          var postedData = queryString.parse(content);
          var contentType;
          var urlObj = url.parse(request.url, true); 
          var uri = urlObj.pathname;
          if (uri === '/favicon.ico') {
            display404(response);
            uri = null;
            urlObj = null;
            return;
          }
          ewdGateway.log("uri: " + uri, 3);
          ewdGateway.log("***** postedData = " + JSON.stringify(postedData), 3);
		  
          if (uri.substring(0,ewdGateway.onBeforeRenderPath.length)===ewdGateway.onBeforeRenderPath) {
            /*		    
              incoming request from GT.M / Cache to invoke a Javascript pre-page script
              eg example URL /onBeforeRender/request.html?module=myModule&method=initialise&token=hkjhkjhkhjkjkhjk
              token is used to identify the sessid
              
              the method should return null string or an error string

              package up the message as an object and put into queue for worker to process
            */

            var onBeforeRenderResponse = new events.EventEmitter();
            //ewdGateway.request = request;
            onBeforeRenderResponse.once("ready", function(results) {
              // response from onBeforeRender method is ready for output to browser
              ewdGateway.log("onBeforeRenderResponse event triggered - results = " + JSON.stringify(results), 2);
              response.writeHead(200, {'Content-Type': 'text/plain'});
              response.write(results + "\r\n");
              response.end();
              //if (ewdGateway.logHTTP) httpLogger(ewdGateway.request, 200);
              onBeforeRenderResponse = null;
              headers = null;
              requestObj = null;
              urlObj = null;
              uri = null;
            });
              
            requestNo++;
            emitters[requestNo] = onBeforeRenderResponse;

            var requestObj = {
              action: {
                type:'onBeforeRender',
                appName: postedData.appName,
                module: postedData.module,
                method: postedData.method,
                reload: postedData.reload,
                token: postedData.token,
                traceLevel: ewdGateway.traceLevel,
                requestNo: requestNo,
                pids: ewdQ.getChildProcesses()
              }
            };
            ewdQ.addToQueue(requestObj, responseHandler);
            return;
          }
          
          if (uri.substring(0,ewdGateway.webSockets.path.length)===ewdGateway.webSockets.path) {
            /*		    
              incoming websocket request from GT.M / Cache
              eg example URL /ewdWebSocket?message=xxxxxxxx&token=hkjhkjhkhjkjkhjk  &broadcast=true
              token is used to identify the registered browser for whom this message is destined
              if broadcast=true, then sent message to all registered browsers
            */
            var client;
            var wsResponse;
            ewdGateway.log("incoming websocket request URL", 1);
            //ewdGateway.log("query: " + JSON.stringify(urlObj.query), 1);
            ewdGateway.log("postedData = " + JSON.stringify(postedData),1);
            if (typeof ewdGateway.socketClientByToken[postedData.token] !== 'undefined') {
              response.writeHead(200, {'Content-Type': 'text/plain'});
              response.end("ok\n");
              client = ewdGateway.socketClientByToken[postedData.token];
              wsResponse = {type: postedData.type};
              if (typeof postedData.message !== 'undefined') wsResponse.message = postedData.message;
              if (typeof postedData.json !== 'undefined') wsResponse.json = JSON.parse(postedData.json);
              if (typeof postedData.content !== 'undefined') wsResponse.content = postedData.content;
              if (typeof postedData.targetId !== 'undefined') wsResponse.targetId = postedData.targetId;
              if (typeof postedData.return !== 'undefined') wsResponse.return = postedData.return;
              client.json.send(wsResponse);
              request.headers['user-agent'] = ewdGateway.database.type;
              if (ewdGateway.logHTTP) httpLogger(request, 200);
            }
            else {
              display404(response);
              if (ewdGateway.logHTTP) httpLogger(request, 404);
            }
            client = null;
            wsResponse = null;
            urlObj = null;
            uri = null;
            return;			 
          }
		  display404(response); 
          urlObj = null;
          uri = null;
        });
      };	  
	  
      var webserver;
      var webSocketServer;
      if (ewdGateway.https.enabled) {
        var https = require("https");
        var options = {
          key: fs.readFileSync(ewdGateway.https.keyPath),
          cert: fs.readFileSync(ewdGateway.https.certificatePath)
        };
	 ewdGateway.log("HTTPS is enabled; listening on port " + ewdGateway.httpPort, 1);
        webserver = https.createServer(options, webserverCallback);
        // Start HTTP listening service for GT.M/Cache to use for WebSockets events
        //  but only if an SSL proxy isn't being used
        if (!ewdGateway.https.useProxy) {
		  console.log("ewdGateway.https: " + JSON.stringify(ewdGateway.https));
          if (ewdGateway.webSockets.enabled) {
            if (typeof ewdGateway.https.httpPort !== 'undefined') {
              webSocketServer = http.createServer(wsServerCallback);
              webSocketServer.listen(ewdGateway.https.httpPort);
              ewdGateway.log("WebSocket HTTP events listened for on port " + ewdGateway.https.httpPort, 1);
            }
          }
        }
        else {
          if (ewdGateway.webSockets.enabled) {
            ewdGateway.log("WebSocket events will be handled using SSL proxy on port " + ewdGateway.https.proxyPort, 1);
          }
        }
      }
      else {
        ewdGateway.log("HTTP is enabled; listening on port " + ewdGateway.httpPort, 1);
        webserver = http.createServer(webserverCallback);
      }
      if (ewdGateway.webSockets.enabled) {
        ewdGateway.sendSocketMsg = function(messageObj) {
          if (typeof ewdGateway.socketClientByToken[messageObj.token] !== 'undefined') {
            var client = ewdGateway.socketClientByToken[messageObj.token];
            delete messageObj.token;
            client.json.send(messageObj);
          }
        }; 
        var wsResponseHandler = function(requestObj, results) {
          var client;
          var response;
          ewdGateway.log("wsResponseHandler has been fired!",2);
          ewdGateway.log("action: " + JSON.stringify(requestObj.action), 3);
          ewdGateway.log("results = " + JSON.stringify(results), 3);
          if (results !== '') {
            var responseObj = {token: requestObj.action.token, type: requestObj.action.messageType, message: results}
            if (responseObj.type === 'ewdGetFragment') {
              responseObj.targetId = requestObj.action.targetId;
            }
            ewdGateway.sendSocketMsg(responseObj);
          }
          requestObj = null;
          results = null;
          client = null;
          response = null;
        }; 
        var log = {};
        if (ewdGateway.silentStart) log = {log: false};
        ewdGateway.io = require(ewdGateway.webSockets.socketIoPath).listen(webserver, log);
        ewdGateway.io.set('log level', 0);
        if ((!ewdGateway.silentStart)&&(ewdGateway.traceLevel > 0)) ewdGateway.io.set('log level', 1);
        ewdGateway.io.sockets.on('connection', function(client){
          ewdGateway.log("socket connected: " + client.id, 1);
          if (ewdGateway.socketClient[client.id]) {
            ewdGateway.socketClient[client.id].connected = true;
            ewdGateway.log("socketClient " + client.id + ": connection set to true", 1);
          }
          else {
            ewdGateway.log("that client.id hasn't been recognised", 1);
          }
          client.connected = true;
  
          client.on('message', function(message){
            var xclient = {id: 'undefined'};
            if (typeof client !== 'undefined') xclient = client;
            //for (i=0;i<message.length;i++) dump = dump + ":" + message.charCodeAt(i);
            //console.log(dump);
            var messageObj = JSON.parse(message);
            if (messageObj.type !== 'keepAlive') ewdGateway.log("Incoming websocket message from " + xclient.id + ": " + message, 2);
            if (messageObj.type === 'register') {
              ewdGateway.socketClientByToken[messageObj.token] = client;
              ewdGateway.socketClient[client.id] = {token: messageObj.token, connected: true};
              ewdGateway.log("WebSocket client " + client.id + " registered with token " + messageObj.token, 1);
              message = null;
              messageObj = null;
              return;
            }
            if (typeof messageObj.handlerModule !== 'undefined') {
              if (typeof messageObj.handlerFunction === 'undefined') messageObj.handlerFunction = 'webSocketHandler';
              var requestObj = {
                action: {
                  type:'onBeforeRender',
                  handlerModule: messageObj.handlerModule,
                  handlerFunction: messageObj.handlerFunction,
                  messageType: messageObj.type,
                  params: messageObj.params,
                  token: messageObj.token,
                  traceLevel: ewdGateway.traceLevel,
                  requestNo: 'customSocketMessage',
                  pids: ewdQ.getChildProcesses()
                }
              };
              ewdQ.addToQueue(requestObj, wsResponseHandler);
              message = null;
              messageObj = null;
              return;
            }
            if (messageObj.type === 'startConsole') {
              var cclient = ewdGateway.socketClientByToken[messageObj.token];
              if (cclient) {
                if (typeof ewdGateway.socketClient[cclient.id] !== 'undefined') {
                  ewdGateway.socketClient[cclient.id].monitoring = true;
                  cclient.json.send({
                    type:'processInfo', 
                    data: {
                      nodeVersion: process.version,
                      masterProcess: process.pid,
                      childProcesses: ewdQ.getChildProcesses(),
                      build: ewdGateway.buildNo + " (" + ewdGateway.buildDate + ")",
                      ewdQBuild: ewdQ.build,
                      interval: ewdGateway.monitorInterval,
                      traceLevel: ewdGateway.traceLevel,
                      logTo: ewdGateway.logTo,
                      logFile: ewdGateway.logFile
                    }
                  });
                }
              }
              return;
            }
            if (messageObj.type === 'exit') {
              for (var i = 0; i < ewdGateway.poolSize; i++) {
                ewdQ.stopChildProcess();
              }
              webserver.close();
              if (typeof webSocketServer !== 'undefined') webSocketServer.close();
              setTimeout(function() {
              process.exit(1);
              },1000);
            }
            if (messageObj.type === 'setParameter') {
              if (messageObj.name === 'monitorInterval') {
                ewdGateway.monitorInterval = messageObj.value;
                ewdQ.setMonitorInterval(messageObj.value); 
              }
              if (messageObj.name === 'monitorLevel') {
                ewdGateway.traceLevel = messageObj.value;
                ewdQ.setTraceLevel(messageObj.value);
                ewdGateway.io.set('log level', 0);
                if ((!ewdGateway.silentStart)&&(messageObj.value > 0)) ewdGateway.io.set('log level', 1);
              }
              if (messageObj.name === 'logTo') {
                ewdGateway.logTo = messageObj.value;
                ewdQ.setLogTo(messageObj.value);
                if (messageObj.value === 'file') ewdGateway.log('ewdGateway2: Starting Log to File at ' + new Date().toUTCString(), ewdGateway.traceLevel, true);
              }
              if (messageObj.name === 'clearLogFile') {
                ewdGateway.log('ewdGateway2: Starting Log to File at ' + new Date().toUTCString(), ewdGateway.traceLevel, true);
              }
              if (messageObj.name === 'changeLogFile') {
                var path = messageObj.value;
                ewdGateway.logFile = path;
                ewdQ.setLogFile(path);
                ewdGateway.log('ewdGateway2: Starting Log to File at ' + new Date().toUTCString(), ewdGateway.traceLevel, true);
              }
              message = null;
              messageObj = null;
              return;
            }
            if (messageObj.type === 'workerProcess') {
              if (messageObj.action === 'add') {
                var pid = ewdQ.startChildProcess();
                ewdGateway.poolSize++;
                ewdQ.setPoolSize(ewdGateway.poolSize);
                messageObj.pid = pid;
                ewdGateway.sendSocketMsg(messageObj);
              }
              if (messageObj.action === 'remove') {
                ewdQ.stopChildProcess();
                ewdGateway.poolSize--;
                ewdQ.setPoolSize(ewdGateway.poolSize);
              }
              message = null;
              messageObj = null;
              return;
            }
            if (typeof ewdGateway.messageHandler[messageObj.type] !== 'undefined') {
              ewdGateway.log("invoking custom method " + messageObj.type);
              ewdGateway.messageHandler[messageObj.type](messageObj);
              message = null;
              messageObj = null;
              return;
            }
            var requestObj = {
              action: {
                type:'socket',
                messageType: messageObj.type,
                message: messageObj.message,
                token: messageObj.token,
                page: messageObj.page,
                targetId: messageObj.targetId,
                nvp: messageObj.nvp,
                traceLevel: ewdGateway.traceLevel,
                requestNo: 'socketRequest'
              }
            };
			
            ewdQ.addToQueue(requestObj, wsResponseHandler);
            message = null;
            messageObj = null;
          });
          
          client.on('disconnect', function() {
            ewdGateway.log("socket disconnected: " + client.id, 1);
            if (ewdGateway.socketClient[client.id]) ewdGateway.socketClient[client.id].connected = false;
          });
        });

      }
      webserver.listen(ewdGateway.httpPort);
      params.callback(ewdGateway);
    });
  }
};

process.on('exit',function() {
  ewdGateway.log("Main Node.js process: " + process.pid + " exiting", 2);
});

