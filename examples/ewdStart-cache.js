var ewd = require('ewdgateway2');

var params = {
      poolSize: 2,
      httpPort: 8080,
	  https: {
	    enabled: false,
	    keyPath: "c:\\node\\ssl\\ssl.key",
	    certificatePath: "c:\\node\\ssl\\ssl.crt",
      },
      ewdPath: '/ewd/',
      webSockets: {
        enabled: true,
        path: '/ewdWebSocket/',
        host: '127.0.0.1',
        socketIoPath: 'c:\\node\\node_modules\\socket.io\\lib\\socket.io'
      },
      database: {
        type: 'cache',
        nodePath: "c:\\Program Files (x86)\\nodejs\\cache",
        path:"c:\\InterSystems\\Cache\\Mgr",
        username: "_SYSTEM",
        password: "SYS",
        namespace: "USER",
        outputFilePath:"c:\\node\\",
      },
      childProcessPath: 'c:\\node\\node_modules\\ewdgateway2\\\\lib\\ewdQWorker.js',
      traceLevel: 2,
      silentStart: false,
      webServerRootPath: 'c:\\node\\www',
      logTo: 'console',
      logFile: 'c:\\node\\ewdLog.txt',
	  logHTTP: true,
      monitorInterval: 30000,
      ewdQPath: './ewdQ',
      management: {
        password: 'keepThisSecret!'
     }
};

ewd.start(params,function(gateway) {
  //console.log("version = " + gateway.version());
  
   gateway.messageHandler.testit = function(request) {
    console.log("*!*!*!*!*! Processing the testit message " + request.message + "; User's EWD token:" + request.token);
	gateway.sendSocketMsg({token: request.token, type: "alert", message: "Node.js handled your request"});
  };
  
});
