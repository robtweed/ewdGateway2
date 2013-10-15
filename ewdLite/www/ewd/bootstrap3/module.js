//  If you're getting patients remotely, uncomment this:
//var client = require('ewdliteclient');

module.exports = {
 
  onSocketMessage: function(ewd) {

    var wsMsg = ewd.webSocketMessage;
    var type = wsMsg.type;
    var params = wsMsg.params;
    var sessid = ewd.session.$('ewd_sessid')._value;
    
    if (type === 'EWD.form.login') {
      if (params.username === '') return 'You must enter a username';
      if (params.password === '') return 'You must enter a password';
      // change for actual validation logic...
      if (params.username !== 'rob' && params.username !== 'Rob') return 'Invalid login';
      if (params.password !== 'secret') return 'Invalid login';
      // ====================

      ewd.session.setAuthenticated();

      ewd.sendWebSocketMsg({
        type: 'loggedInAs',
        message: {
          fullName: 'Rob', // change for proper registered name
        }
      });
      return ''; 
    }

    if (!ewd.session.isAuthenticated) return;

    if (type === 'patientQuery') {

      // local patient lookup from VistA

      if (!patientIndex) var patientIndex = new ewd.mumps.GlobalNode("DPT", ["B"]);
      var results = [];
      var names = {};
      var i = 0;
      patientIndex._forPrefix(params.prefix.toUpperCase(), function(name, node) {
        node._forEach(function(id) {
          i++;
          if (i > 40) return true;
          results.push({id: id, text: name});
          names[id] = name;
        });
        if (i > 40) return true;
      });
      ewd.session.$('names')._delete();
      ewd.session.$('names')._setDocument(names);
      ewd.sendWebSocketMsg({
        type: 'patientMatches',
        params: results
      });
      return;

      /* ====== Patient lookup against remote VistA system via EWD Lite web service =======

      var inputs = {
        accessId: '[access ID for this client system]',
        prefix: params.prefix.toUpperCase()
      };
      var args = {
        host: 'localhost',
        port: 8084, // port number
        ssl: true,
        appName: '[remote module name]',
        serviceName: '[remote service name]',
        params: inputs,
        secretKey: '[secret key]'
      };
      client.run(args, function(error, data) {
        if (error) {
          console.log('An error occurred: ' + JSON.stringify(error));
        }
        else {
          ewd.sendWebSocketMsg({
            type: 'patientMatches',
            params: data.results
          });
          var names = {};
          for (var i = 0; i < data.results.length; i++) {
            names[data.results[i].id] = data.results[i].text;
          }
          ewd.session.$('names')._delete();
          ewd.session.$('names')._setDocument(names);
        }
      });
       ========================
      */
    }

    if (type === 'patientSelected') {
      return {patientName: ewd.session.$('names').$(params.patientId)._value};
    }

  }
};

