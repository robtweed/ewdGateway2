var ewd = require('ewdgateway2');

var params = {
      poolSize: 2,
      httpPort: 8080,
	  https: {
	    enabled: true,
	    keyPath: "ssl/ssl.key",
	    certificatePath: "ssl/ssl.crt",
      },
      database: {
        type: 'globals',
        nodePath: "cache",
        path:"/Users/robtweed/globalsdb/mgr",
      },
	  modulePath: '/Users/robtweed/globalsdb/node_modules',
      traceLevel: 3,
      webServerRootPath: 'www',
      logTo: 'console',
      logFile: 'ewdLog.txt',
      management: {
        password: 'keepThisSecret!'
     }
};

ewd.start(params,function(gateway) {
});
