var ewd = require('./node_modules/ewdgateway2/lib/ewdGateway2');

var params = {
  poolSize: 4,
  httpPort: 8080,
  https: {
    enabled: true,
    keyPath: '/home/vista/www/node/ssl/ssl.key',
    certificatePath: '/home/vista/www/node/ssl/ssl.crt',
    useProxy: false,
    //proxyPort: 89,
    httpPort: 8081
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
  traceLevel: 2,
  silentStart: false,
  webServerRootPath: '',
  logTo: 'console',
  logFile: '/home/vista/www/node/ewdLog.txt',
  logHTTP: true,
  monitorInterval: 30000,
  management: {
    password: 'keepThisSecret!'
  }
};

ewd.start(params,function(gateway) {
  //console.log("version = " + gateway.version());
  
});
