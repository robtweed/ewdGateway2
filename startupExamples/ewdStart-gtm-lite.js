var ewd = require('./ewdGateway2');

var params = {
      poolSize: 2,
      httpPort: 8080,
	  https: {
	    enabled: true,
	    keyPath: "ssl/ssl.key",
	    certificatePath: "ssl/ssl.crt",
      },
      database: {
        type: 'gtm',
        nodePath:"/home/vista/mumps",
        outputFilePath:"/home/vista/www/node",
      },
      webSockets: {
        socketIoPath: '/usr/lib/node_modules/socket.io'
      },
      lite: true,
      modulePath: '/home/vista/www/node/node_modules',
      traceLevel: 3,
      webServerRootPath: '/home/vista/www',
      logTo: 'console',
      logFile: 'ewdLog.txt',
      management: {
        password: 'keepThisSecret!'
     }
};

ewd.start(params,function(gateway) {
});
