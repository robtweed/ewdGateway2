/*

 ----------------------------------------------------------------------------
 | ewdGateway2: Node.js-based EWD gateway for GT.M & Cache                  |
 |                                                                          |
 | Copyright (c) 2013-14 M/Gateway Developments Ltd,                        |
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
var crypto = require("crypto");
var net = require("net");
//var util = require('util');
//var v8p = require("v8-profiler");
//var heapdump = require('/home/tzdev/heapdump');

 
var ewdGateway = {
  buildNo: 52,
  buildDate: "24 January 2014",
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
      else if (name === 'webRTC') {
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
    var date = new Date();
    message = date.toDateString() + ' ' + date.toLocaleTimeString() + ': ' + message;
    ewdGateway.browserLogger.emit('send',{type: 'consoleText', text: message});
  },
  sendMgrMessage: function(message) {
    if (ewdGateway.traceLevel > 0) ewdGateway.browserLogger.emit('send', message);
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
        namespace: "USER",
		address: '127.0.0.1',
		port: 27017,
		also: []
      },
      lite: false,
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
        externalListenerPort: 10000
      },
      logFile: 'ewdLog.txt',
      logTo: 'console',
      logHTTP: false,
      modulePath: '/var/ewd_modules',
      monitorInterval: 30000,
      poolSize: 2,
      silentStart: false,
      traceLevel: 1,
      webServerRootPath: '/var/www',
      webservice: {
        json: {
          path: '/json'
        }
      },
      management: {
        path: '/ewdGatewayMgr',
        password: 'makeSureYouChangeThis!'
      },
      crypto: {
        path: '/ewdCrypto'
      },
      webRTC: {
        enabled: false,
        resources: {
          screen: false,
          video: true,
          audio: false
        }
      }
    };
    ewdGateway.setDefaults(defaults, params);
    if (ewdGateway.database.type === 'globals') {
      ewdGateway.database.type = 'cache';
      ewdGateway.lite = true;
    }
    if (ewdGateway.lite) {
      ewdGateway.webSockets.enabled = true;
    }
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
      sendMgrMessage: ewdGateway.sendMgrMessage,
      socketClientByToken: ewdGateway.socketClientByToken,
      lite: ewdGateway.lite,
      webServerRootPath: ewdGateway.webServerRootPath,
      modulePath: ewdGateway.modulePath
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

          // ******** JSON Web Service Request *******************

          if (uri.substring(0,ewdGateway.webservice.json.path.length) === ewdGateway.webservice.json.path) {
            /*		    
              incoming request to invoke a JSON-based Web Service
              eg example URL /json/myApp/serviceName?param1=xxx&param2=yyy&userId=rob123&signature=1234567
            */

            var header = {
              'Server': 'EWD Lite',
              'Date': new Date().toUTCString(),
              'Content-Type': 'application/json'
            };

            var errorResponse = function(errorObj) {
              response.writeHead(400, header); 
              response.write(JSON.stringify(errorObj));  
              response.end(); 
            };

            ewdGateway.log("incoming JSON Web Service request: " + uri, 1);
            var pieces = uri.split('/');
            var appName = pieces[2];
            var serviceName = pieces[3];
            var query = urlObj.query;
            ewdGateway.log("JSON WS: query = " + JSON.stringify(query), 2);
            ewdGateway.log("JSON WS: app: " + appName + "; service: " + serviceName, 2);

            if (!query.accessId || !query.signature || !query.timestamp) {
              errorResponse({error: 'Missing Access Credentials'});
              return;
            }

            if (!(new Date(query.timestamp).getFullYear() > 0)) {
              errorResponse({error: 'Invalid timestamp'});
              return;
            }

            //var json = {a: 123, b: 234};
            //response.writeHead(200, {'Content-Type': 'application/json'});
            //response.write(JSON.stringify(query));
            //response.end("\n");

            /*
              package up the JSON request as an object and put into queue for worker to process
            */

            var onWebServiceResponse = new events.EventEmitter();
     
            onWebServiceResponse.once('ready', function(results) {
              // response from JSON Web Service method is ready for output to browser
              ewdGateway.log("onWebServiceResponse event triggered - results = " + JSON.stringify(results), 2);

              if (results.error) {
                errorResponse(results.error);
              }
              else {
                response.writeHead(200, header);
                response.write(JSON.stringify(results.json));
                response.end();
              }
              onWebServiceResponse = null;
              headers = null;
              requestObj = null;
              urlObj = null;
              uri = null;
            });
              
            requestNo++;
            emitters[requestNo] = onWebServiceResponse;

            var requestObj = {
              action: {
                type:'onWebService',
                appName: appName,
                serviceName: serviceName,
                query: query,
                uri: uri,
                host: request.headers.host,
                traceLevel: ewdGateway.traceLevel,
                requestNo: requestNo,
                pids: ewdQ.getChildProcesses()
              }
            };
            ewdQ.addToQueue(requestObj, responseHandler);
            return;

         }

         // ******** Crypto request from GT.M *********************


          if (uri.substring(0,ewdGateway.crypto.path.length)===ewdGateway.crypto.path) {
            /*		    
              incoming request from GT.M / Cache to invoke a crypto function in Node.js
              eg example URL /crypto?password=xxxxxx&fn=createHmac&type=sha512&key=key&string=helloworld
            */

            ewdGateway.log("incoming crypto request URL", 1);
            ewdGateway.log("postedData = " + JSON.stringify(postedData),2);
            if (typeof postedData.password !== 'undefined') {
              if (postedData.password === ewdGateway.management.password) {

                // invoke crypto function here
                var output = '';
                if (typeof postedData.fn !== 'undefined') {
                  if (postedData.fn === 'createHmac') {
                    var type = '';
                    if (typeof postedData.type !== 'undefined') type = postedData.type;
                      if (type === 'sha1' || type === 'sha256' || type === 'sha512') {
                        if (typeof postedData.key !== 'undefined' && typeof postedData.string !== 'undefined') {
                          var hmac = crypto.createHmac(type, postedData.key);
                          hmac.update(postedData.string);
                          output = hmac.digest('base64');
                        }
                      }
                  }
                  if (output !== '') {
                    response.writeHead(200, {'Content-Type': 'text/plain'});
                    response.end(output + "\n");
                  }
                  else {
                    display404(response);
                  }
                }
                else {
                  display404(response);
                }
              }
              else {
                display404(response);
              }
            }
            else {
              display404(response);
              if (ewdGateway.logHTTP) httpLogger(request, 404);
            }
            client = null;
            urlObj = null;
            uri = null;
            return;
          }

          if (uri.substring(0,ewdGateway.management.path.length)===ewdGateway.management.path) {
            /*		    
              incoming management request from GT.M / Cache
              eg example URL /ewdGatewayManager?password=xxxxxxxx&task=value

              tasks:  addProcess (true),
                      stopProcess (pid),
                      traceLevel (level)
                      logTo (device)
                      clearLog (true)
                      monitorInterval (value)
                      listChildProcesses (true)
                      disableProcess (pid)
                      exit


              password must match that defined in startup module
            */
            ewdGateway.log("incoming management request URL: " + uri, 1);

            if (request.method.toLowerCase() === 'get') postedData = urlObj.query;

            //var query = urlObj.query;
            //ewdGateway.log("WS: query = " + JSON.stringify(query), 2);

            ewdGateway.log("postedData = " + JSON.stringify(postedData),2);
            if (typeof postedData.password !== 'undefined') {
              //ewdGateway.log("management password: " + ewdGateway.management.password, 2);
              if (postedData.password === ewdGateway.management.password) {
                response.writeHead(200, {'Content-Type': 'text/plain'});
                response.end("ok\n");

                if (postedData.exit === 'true') {
                  console.log("**** exiting!");
                  for (var i = 0; i < ewdGateway.poolSize; i++) {
                    ewdQ.stopChildProcess();
                  }
                  webserver.close();
                  if (typeof webSocketServer !== 'undefined') webSocketServer.close();
                  setTimeout(function() {
                    process.exit(1);
                  },1000);
                }

                if (typeof postedData.stopProcess !== 'undefined') {
                  if (postedData.pid) {
                    ewdGateway.log("stopping process " + postedData.pid, 2);
                    // if the pid isn't registered then stopChildProcess just returns
                    ewdQ.stopChildProcess(postedData.pid);
                  }
                  return;
                }

                if (typeof postedData.getChildProcessMemory !== 'undefined') {
                  if (postedData.pid) {
                    //ewdGateway.log("interrogating process " + postedData.pid, 2);
                    // if the pid isn't registered then getProcessMemory returns an empty object
                    ewdQ.getChildProcessMemory(postedData.pid);
                  }
                  return;
                }

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
                else {
                  display404(response);
                }
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
		  
          if (!ewdGateway.lite && (uri.substring(0,ewdGateway.ewdPath.length)===ewdGateway.ewdPath)&&((uri.substring(uri.length-4)==='.ewd')||(uri.substring(uri.length-6)==='.mgwsi'))) {
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
                //console.log('*** responseCode: ' + JSON.stringify(responseCode));
              }
              if (responseCode.length < 2) responseCode = ['', 404];
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

            if (uri.substring(0,ewdGateway.webServerRootPath.length)===ewdGateway.webServerRootPath) {
              uri = uri.substring(ewdGateway.webServerRootPath.length);
            }

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

         if (uri.substring(0,ewdGateway.crypto.path.length)===ewdGateway.crypto.path) {
            /*		    
              incoming request from GT.M / Cache to invoke a crypto function in Node.js
              eg example URL /crypto?password=xxxxxx&fn=createHmac&type=sha512&key=key&string=helloworld
            */

            ewdGateway.log("incoming crypto request URL", 1);
            ewdGateway.log("postedData = " + JSON.stringify(postedData),2);
            if (typeof postedData.password !== 'undefined') {
              if (postedData.password === ewdGateway.management.password) {

                // invoke crypto function here
                var output = '';
                if (typeof postedData.fn !== 'undefined') {
                  if (postedData.fn === 'createHmac') {
                    var type = '';
                    if (typeof postedData.type !== 'undefined') type = postedData.type;
                      if (type === 'sha1' || type === 'sha256' || type === 'sha512') {
                        if (typeof postedData.key !== 'undefined' && typeof postedData.string !== 'undefined') {
                          var hmac = crypto.createHmac(type, postedData.key);
                          hmac.update(postedData.string);
                          output = hmac.digest('base64');
                        }
                      }
                  }
                  if (output !== '') {
                    response.writeHead(200, {'Content-Type': 'text/plain'});
                    response.end(output + "\n");
                  }
                  else {
                    display404(response);
                  }
                }
                else {
                  display404(response);
                }
              }
              else {
                display404(response);
              }
            }
            else {
              display404(response);
              if (ewdGateway.logHTTP) httpLogger(request, 404);
            }
            client = null;
            urlObj = null;
            uri = null;
            return;
          }

		  
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
        if (!ewdGateway.lite) {
          if (!ewdGateway.https.useProxy) {
            //console.log("ewdGateway.https: " + JSON.stringify(ewdGateway.https));
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
      }
      else {
        ewdGateway.log("HTTP is enabled; listening on port " + ewdGateway.httpPort, 1);
        webserver = http.createServer(webserverCallback);
      }
      if (ewdGateway.webSockets.enabled) {

        // TCP socket listener for incoming messages from other GT.M or Cache processes

        if (ewdGateway.webSockets.externalListenerPort) {
          var tcpServer = net.createServer(function(client) {
            client.on("data", function (data) {
              try {
                var obj = JSON.parse(data);
                // process the object
                // but only if the password matches!
                if (obj.password === ewdGateway.management.password) {
                  var extResponseHandler = function(requestObj, results) {
                    var client;
                    var response;
                    //ewdGateway.log("extResponseHandler has been fired!",2);
                    console.log("**** results: " + JSON.stringify(results));
                    for (var i = 0; i < results.tokens.length; i++) {
                      client = ewdGateway.socketClientByToken[results.tokens[i]];
                      if (client) {
                        client.json.send({
                          type:results.type, 
                          message: results.message
                        });
                      }
                    }
                  }
                  if (obj.recipients) {
                    if (obj.recipients !== 'byApplication') obj.application = '';
                    if (obj.recipients !== 'bySessionValue') {
                      obj.session = {
                        name: '',
                        value: ''
                      };
                    }
                    var requestObj = {
                      action: {
                        type:'EWD.getSessionTokens',
                        messageType: obj.type,
                        recipients: obj.recipients,
                        application: obj.application,
                        session: obj.session,
                        message: obj.message
                      }
                    };
                    ewdQ.addToQueue(requestObj, extResponseHandler);
                  }
                }
              }
              catch(err) {
                // just ignore it
              }
            });
          });
          tcpServer.listen(ewdGateway.webSockets.externalListenerPort); 
        }

        // end of TCP socket listener

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
          if (requestObj.action.type === 'EWD.register') {
            client = ewdGateway.socketClient[results.clientId];
            ewdGateway.socketClientByToken[results.token] = client;
            client.json.send({
              type:'EWD.registered', 
              token: results.token, 
              clientId: results.clientId
            });
            ewdGateway.socketClient[client.id] = {token: results.token, connected: true};
            ewdGateway.log("WebSocket client " + client.id + " registered with token " + results.token, 1);
          }
          else if (requestObj.action.messageType.indexOf('EWD.form.') !== -1) {
            var responseObj = {
              token: requestObj.action.token, 
              type: requestObj.action.messageType, 
              ok: true
            }
            if (results !== '') {
              responseObj.error = results;
              responseObj.ok = false;
              if (typeof requestObj.action.params.alertTitle !== 'undefined') {
                responseObj.alertTitle = requestObj.action.params.alertTitle;
              }
              responseObj.framework = requestObj.action.params.js_framework;
            }
            ewdGateway.sendSocketMsg(responseObj);
          }
          else if (results !== '') {
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
            ewdGateway.log("that client.id hasn't been registered yet", 1);
          }
          client.connected = true;
          client.json.send({type:'EWD.connected'});

          // **** WebRTC handlers ********************

          if (ewdGateway.webRTC.enabled) {
            client.resources = ewdGateway.webRTC.resources;
            console.log("********* WebRTC resources: " + JSON.stringify(ewdGateway.webRTC.resources));

            client.on('webRTCJoinRoom', function(name, cb) {

              function removeFeed(type) {
                console.log("*** on remove");
                ewdGateway.io.sockets.in(client.room).emit('remove', {
                  id: client.id,
                  type: type
                });
              }

              function describeRoom(name) {
                var clients = ewdGateway.io.sockets.clients(name);
                var result = {
                  clients: {}
                };
                clients.forEach(function (client) {
                  result.clients[client.id] = client.resources;
                });
                return result;
              }

              console.log("*** on join");
              // sanity check
              if (typeof name !== 'string') return;
              // leave any existing rooms
              if (client.room) removeFeed();
              if (cb) cb(null, describeRoom(name))
              client.join(name);
              client.room = name;
            });

            client.on('webRTCCreateRoom', function (name, cb) {
              console.log("**** on create");
              function describeRoom(name) {
                var clients = ewdGateway.io.sockets.clients(name);
                var result = {
                  clients: {}
                };
                clients.forEach(function (client) {
                  result.clients[client.id] = client.resources;
                });
                return result;
              }

              function join(name, cb) {
                console.log("*** join: name = " + name);
                // sanity check
                if (typeof name !== 'string') return;
                // leave any existing rooms
                if (client.room) removeFeed();
                if (cb) cb(null, describeRoom(name))
                client.join(name);
                client.room = name;
              }

              if (arguments.length == 2) {
                cb = (typeof cb == 'function') ? cb : function () {};
                name = name; // || uuid();
              }
              else {
                cb = name;
                name = uuid();
              }
              // check if exists
              if (ewdGateway.io.sockets.clients(name).length) {
                console.log("*** cb taken");
                cb('taken');
              } 
              else {
                console.log("*** joining room " + name);
                join(name);
                if (cb) cb(null, name);
              }
            });

            client.on('webRTCMsg', function (details) {
              console.log("********** WebRTC Message received! " + JSON.stringify(details));
              var otherClient = ewdGateway.io.sockets.sockets[details.to];
              if (!otherClient) return;
              details.from = client.id;
              otherClient.emit('webRTCMsg', details);
            });

            // **** End of WebRTC handlers ********************  
          }

          client.on('message', function(message){
            var xclient = {id: 'undefined'};
            if (typeof client !== 'undefined') xclient = client;
            //for (i=0;i<message.length;i++) dump = dump + ":" + message.charCodeAt(i);
            //console.log(dump);
            var messageObj;
            try {
              messageObj = JSON.parse(message);
            }
            catch(err) {
              return;
            }
            if (messageObj.type !== 'keepAlive') ewdGateway.log("Incoming websocket message from " + xclient.id + ": " + message, 2);

            if (messageObj.type === 'EWD.register') {
              ewdGateway.socketClient[client.id] = client;
              var requestObj = {
                action: {
                  type:'EWD.register',
                  clientId: client.id,
                  application: messageObj.application,
                  port: ewdGateway.httpPort,
                  traceLevel: ewdGateway.traceLevel,
                  requestNo: 'customSocketMessage',
                  pids: ewdQ.getChildProcesses(),
                  password: ewdGateway.management.password
                }
              };
              ewdQ.addToQueue(requestObj, wsResponseHandler);
              message = null;
              messageObj = null;
              return;
            }
			
            if (messageObj.type === 'EWD.startConsole') {
                if (messageObj.password === ewdGateway.management.password) {
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
              }
              return;
            }
            if (messageObj.type === 'EWD.setParameter') {
              delete messageObj.handlerModule;
              messageObj.type = 'setParameter';
            }
            if (messageObj.type === 'EWD.workerProcess') {
              delete messageObj.handlerModule;
              messageObj.type = 'workerProcess';
            }	
            if (messageObj.type === 'EWD.exit') {
              delete messageObj.handlerModule;
              messageObj.type = 'exit';
            }	
            if (messageObj.type === 'register') {
              ewdGateway.socketClientByToken[messageObj.token] = client;
              client.json.send({type:'registered'});
              ewdGateway.socketClient[client.id] = {token: messageObj.token, connected: true};
              ewdGateway.log("WebSocket client " + client.id + " registered with token " + messageObj.token, 1);
              message = null;
              messageObj = null;
              return;
            }
            if (messageObj.type === 'stopChildProcess') {
              if (messageObj.password === ewdGateway.management.password) {
                if (ewdGateway.poolSize > 1) {
                  if (messageObj.pid) ewdQ.stopChildProcess(messageObj.pid);
                }
              }
              return;
            }
            if (typeof messageObj.handlerModule !== 'undefined') {
              if (typeof messageObj.handlerFunction === 'undefined') {
                if (messageObj.lite) {
                  messageObj.handlerFunction = 'onSocketMessage';
                }
                else {
                  messageObj.handlerFunction = 'webSocketHandler';
                }
              }
              var requestObj = {
                action: {
                  type:'onBeforeRender',
                  handlerModule: messageObj.handlerModule,
                  handlerFunction: messageObj.handlerFunction,
                  messageType: messageObj.type,
                  params: messageObj.params,
                  token: messageObj.token,
                  ipAddress: client.handshake.address,
                  traceLevel: ewdGateway.traceLevel,
                  requestNo: 'customSocketMessage',
                  pids: ewdQ.getChildProcesses()
                }
              };
              if (messageObj.lite) requestObj.action.lite = messageObj.lite;
              if (typeof messageObj.usePid !== 'undefined') requestObj.action.usePid = messageObj.usePid;
              if (messageObj.type === 'EWD.benchmark' && messageObj.password === ewdGateway.management.password){
                var bmmax = messageObj.noOfMessages || 101;
                var req;
                for (var i = 0; i < bmmax; i++) {
                  req = JSON.parse(JSON.stringify(requestObj));
                  req.action.params.messageNo = i;
                  ewdQ.addToQueue(req, wsResponseHandler);
                }
              }
              else {
                ewdQ.addToQueue(requestObj, wsResponseHandler);
              }
              message = null;
              messageObj = null;
              return;
            }
            if (messageObj.type === 'startConsole') {
              if (messageObj.password === ewdGateway.management.password) {
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
              }
              return;
            }
            if (messageObj.type === 'exit') {
              if (messageObj.password === ewdGateway.management.password) {
                for (var i = 0; i < ewdGateway.poolSize; i++) {
                  ewdQ.stopChildProcess();
                }
                webserver.close();
                if (typeof webSocketServer !== 'undefined') webSocketServer.close();
                setTimeout(function() {
                  process.exit(1);
                },1000);
              }
            }
            if (messageObj.type === 'setParameter') {
              if (messageObj.password !== ewdGateway.management.password) return;
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
              if (messageObj.password !== ewdGateway.management.password) return;
              delete messageObj.password;
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
            if (typeof messageObj.usePid !== 'undefined') requestObj.action.usePid = messageObj.usePid;
			
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
      if (params.callback) params.callback(ewdGateway);
    });
  }
};

process.on('exit',function() {
  ewdGateway.log("Main Node.js process: " + process.pid + " exiting", 2);
});

