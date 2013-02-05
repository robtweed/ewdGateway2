var ewd = require('./ewdGateway2');

var params = {
  poolSize: 4,
  httpPort: 8080,
  https: {
    enabled: true
  },
  ewdPath: '/vista/',
  webSockets: {
    enabled: true
  },
  database: {
    type: 'gtm',
    nodePath:"/home/vista/mumps",
    outputFilePath:"/home/vista/www/node",
  },
  traceLevel: 1,
  silentStart: false,
  webServerRootPath: '',
  logTo: 'console',
  logFile: '/home/vista/www/node/ewdLog.txt',
  monitorInterval: 30000,
  management: {
    password: 'keepThisSecret!'
  }
};

ewd.start(params,function(gateway) {
  //console.log("version = " + gateway.version());
  
   gateway.messageHandler.testit = function(request) {
    gateway.log("*!*!*!*!*! Processing the testit message " + request.message + "; User's EWD token:" + request.token, gateway.traceLevel);
    gateway.sendSocketMsg({token: request.token, type: "alert", message: "Node.js handled your request"});
  };
  
});
