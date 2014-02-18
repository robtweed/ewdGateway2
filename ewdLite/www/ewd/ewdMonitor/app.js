EWD.application = {
  name: 'ewdMonitor',
  timeout: 3600,
  login: true,
  labels: {
    'ewd-title': 'EWD.js Monitor',
    'ewd-loginPanel-title': 'EWD.js Monitor',
    'ewd-navbar-title-phone': 'EWD.js',
    'ewd-navbar-title-other': 'EWD.js Monitor',
    'ewd-menu-title': 'Menu'
  },
  navFragments: {
    memory: {
      cache: false
    },
    sessions: {
      cache: false
    },
    db: {
      cache: true
    },
    importer: {
      cache: true
    },
    about: {
      cache: true
    }
  },

  onStartup: function() {

    EWD.bootstrap3.nav.enable();

    EWD.maxConsoleLength = 1000;

    EWD.qMax = 0;

    EWD.memory = {
      master: {
        rss: 'Not yet available',
        heapTotal: 'Not yet available',
        heapUsed: 'Not yet available'
      },
      plot: {
        master: []
      }
    };

    EWD.currentGraph = false;

    EWD.getPlotData = function(name) {
      var data = {
        rss: [],
        heapTotal: [],
        heapUsed: []
      };
      for (var i = 0; i < EWD.memory.plot[name].length; i++) {
        data.rss.push([i, +EWD.memory.plot[name][i].rss]);
        data.heapTotal.push([i, +EWD.memory.plot[name][i].heapTotal]);
        data.heapUsed.push([i, +EWD.memory.plot[name][i].heapUsed]);
      }
      return data;
    };

    EWD.replotGraph = function(name) {
      if (EWD.memory.plot[name]) {
        var data = EWD.getPlotData(name);
        EWD.plot.setData([
          {data: data.rss, label: 'rss'},
          {data: data.heapTotal, label: 'heapTotal'}, 
          {data: data.heapUsed, label: 'heapUsed'} 
        ]);
        EWD.plot.setupGrid();
        EWD.plot.draw();
      }
      else {
        EWD.currentGraph = 'master';
      }
    };

    EWD.addChildProcessToTable = function(pid) {
      var html = '';
      html = html + '<tr class="table" id="cpRow' + pid + '">';
      html = html + '<td class="cpPid" id="cpPid' + pid + '">' + pid + '</td>';
      html = html + '<td id="cpRequests' + pid + '">0</td>';
      html = html + '<td id="cpAvailable' + pid + '">true</td>';
      //html = html + '<td><button class="btn btn-danger pull-right cpStop" type="button" id="cpStopBtn' + pid + '">Stop</button></td>';
      html = html + '<td><button class="btn btn-danger pull-right cpStop" type="button" id="cpStopBtn' + pid + '" data-toggle="tooltip" data-placement="top" title="" data-original-title="Stop Child Process"><span class="glyphicon glyphicon-remove"></span></button></td>';
      html = html + '</tr>';
      EWD.memory['cpPid' + pid] = {
        rss: 'Not yet available',
        heapTotal: 'Not yet available',
        heapUsed: 'Not yet available'
      };
      EWD.memory.plot['cpPid' + pid] = [];
      return html;
    };

    EWD.enablePopovers = function() {
      $('.cpPid').popover({
        title: "Memory Utilisation",
        html: true,
        trigger: "hover",
        container: 'body',
        content: function() {
          var html = '<table>                                                        \
                    <tr><td>rss:</td><td id="' + this.id + 'rss">' + EWD.memory[this.id].rss + '</td></tr>              \
                    <tr><td>Heap Total:</td><td id="' + this.id + 'heapTotal">' + EWD.memory[this.id].heapTotal + '</td></tr> \
                    <tr><td>Heap Used:</td><td id="' + this.id + 'heapUsed">' + EWD.memory[this.id].heapUsed + '</td></tr>   \
                  </table><br /><table id="' + this.id + 'Modules"> \
                    <thead><tr>    \
                      <th>Modules loaded</th>  \
                    </tr></thead>  \
                    <tbody>';
          for (var name in EWD.memory[this.id].modules) {
            html = html + '<tr><td>' + name + '</td></tr>';
          }
          html = html + '</tbody> \
                  </table>';
          return html;
        }
      });
      $('.cpStop').on('click', function(e) {
        if ($('#childProcessTable tr').length > 2) {
          var id = e.target.id;
          if (!id) id = e.target.parentNode.id;
          var pid = id.split('cpStopBtn')[1];
          EWD.sockets.sendMessage({
            type: "stopChildProcess", 
            password: EWD.password,
            pid: pid
          });
          $('#cpRow' + pid).remove();
          delete EWD.memory.plot['cpPid' + pid];
          delete EWD.memory['cpPid' + pid];
        }
        else {
          toastr.clear();
          toastr.warning('At least one Child Process must be left running');
        }
      });
    };

    EWD.getGlobalSubscripts = function(params) {
      EWD.sockets.sendMessage({
        type: 'getGlobalSubscripts',
        params: params
      });  
    };

    // FuelUX Tree
    EWD.application.tree = {};
    EWD.application.tree.DataSource = function (options) {
      this._formatter = options.formatter;
      this._columns = options.columns;
      this._data = options.data;
    };
    EWD.application.tree.DataSource.prototype = {
      columns: function () {
        return this._columns;
      },
      data: function (options, callback) {
        if (jQuery.isEmptyObject(options)) {
          // load up the tree
          callback({data: this._data});
        }
        else {
          // fetch sub-items
          //console.log('options: ' + JSON.stringify(options, null, 2));
          EWD.application.tree.callback = callback;
          var type;
          var appName;
          var folder;
          if (options.type === 'folder') {
            EWD.getGlobalSubscripts({
              rootLevel: false,
              operation: options.operation,
              globalName: options.globalName,
              subscripts: options.subscripts
            });
          }
        }
      }
    };

    EWD.application.tree.confirmDelete = function(subscripts, xtype) {
      var globalName = subscripts.shift();
      $('#confirmPanelHeading').text('Are you sure you want to delete this record:');
      $('#confirmPanelQuestion').text(globalName + JSON.stringify(subscripts));
      $('#confirmPanelOKBtn').text('Yes');
      $('#confirmPanelOKBtn').attr('data-globalName', globalName);
      $('#confirmPanelOKBtn').attr('data-subscripts', JSON.stringify(subscripts));
      $('#confirmPanelOKBtn').attr('data-event-type', 'deleteGlobalNode');
      $('#confirmPanelOKBtn').attr('data-x-type', xtype);
      $('#confirmPanel').modal('show');
      //EWD.stopBtn = 'deleteGlobalNode';
    };

    EWD.application.tree.addDeleteButton = function() {
      var text;
      var nodeSubscript;
      var nodeValue;
      EWD.mouseIn = false;

      var clearButton = function() {
          if ($('#xcheck').length > 0) {
            var xtype = $('#xcheck').attr('class');
            if (xtype === 'xfolder') {
              text = $('#xcheck').attr('data-x-name');
              var parNode = $('#xcheck').parent();
              $('#xcheck').remove();
              $(parNode).text(text);
            }
            if (xtype === 'xitem') {
              var nodeSubscript = $('#xcheck').attr('data-x-name');
              var nodeValue = $('#xcheck').attr('data-x-value');
              var parNode = $('#xcheck').parent();
              $('#xcheck').remove();
              $(parNode).html(nodeSubscript + '<span>: </span>' + nodeValue);
            }
          }
      };


      setTimeout(function() {
        $('.tree-folder-name').hover(function(e) {
          e.stopPropagation();
          if (EWD.mouseIn) return;
          EWD.mouseIn = true;
          clearButton();
          text = $(this).text().trim();
          //$(this).html('<div class="checkbox" id="xcheck"><label id="xcheckText">' + text + '<input type="checkbox" name="xxx" /></label></div>');
          $(this).html('<div id="xcheck" class="xfolder" data-x-name="' + text + '">' + text + '&nbsp;&nbsp;<button type="button" class="btn btn-default btn-xs" data-toggle="tooltip" data-placement="top" data-original-title="Delete this node and its children"><span class="glyphicon glyphicon-remove"></span></button></div>');
          $('[data-toggle="tooltip"]').tooltip();
          $('#xcheck').on('click', function(evt) {
            evt.stopPropagation();
            var parents = $(e.target).parents('.tree-folder');
            var nodes = [];
            for (var i = 0; i < parents.length; i++) {
              nodes.push($(parents[i]).find('.tree-folder-name:first'));
            }
            var path = [];
            for (i = 0; i < nodes.length; i++) {
              path.push($(nodes[i]).text().trim());
            }
            path.reverse();
            path[path.length - 1] = text;
            console.log(JSON.stringify(path));
            EWD.application.tree.node = $(e.target).parents('.tree-folder:first');
            EWD.application.tree.confirmDelete(path, 'folder');
          });
          $('#xcheck').on('mouseleave', function(evt) {
            evt.stopPropagation();
            clearButton();
          });
          EWD.mouseIn = false;
        });

        $('.tree-item-name').hover(function(e) {
          e.stopPropagation();
          if (EWD.mouseIn) return;
          EWD.mouseIn = true;
          clearButton();
          text = $(this).html();
          nodeSubscript = text.split('<span>')[0];
          nodeValue = text.split('</span>')[1];
          $(this).html('<div id="xcheck" class="xitem" data-x-name="' + nodeSubscript + '" data-x-value="' + nodeValue + '">' + text + '&nbsp;&nbsp;<button type="button" class="btn btn-default btn-xs" data-toggle="tooltip" data-placement="top" data-original-title="Delete"><span class="glyphicon glyphicon-remove"></span></button></div>');
          $('[data-toggle="tooltip"]').tooltip();
          $('#xcheck').on('click', function(evt) {
            evt.stopPropagation();
            var parents = $(this).parents('.tree-folder');
            var nodes = [];
            for (var i = 0; i < parents.length; i++) {
              nodes.push($(parents[i]).find('.tree-folder-name:first'));
            }
            var path = [];
            for (i = 0; i < nodes.length; i++) {
              path.push($(nodes[i]).text().trim());
            }
            path.reverse();
            //var parNode = $(this).parents('.tree-item:first').parent(); 
            //path.push($(parNode).find('.tree-folder-name:first').text().trim());
            path.push(nodeSubscript);
            console.log(JSON.stringify(path));
            EWD.application.tree.node = $(this).parents('.tree-item:first');
            EWD.application.tree.confirmDelete(path, 'item');
          });
          $('#xcheck').on('mouseleave', function(evt) {
            evt.stopPropagation();
            clearButton();
          });
          EWD.mouseIn = false;
        });
     
      },300);
    };


    // Enable tooltips
    $('[data-toggle="tooltip"]').tooltip();


    $('#mainProcess-pid').popover({
      title: "Memory Utilisation",
      html: true,
      trigger: "hover",
      content: function() {
        return '<table>                                                        \
                  <tr><td>rss:</td><td id="master-rss">' + EWD.memory.master.rss + '</td></tr>              \
                  <tr><td>Heap Total:</td><td id="master-heapTotal">' + EWD.memory.master.heapTotal + '</td></tr> \
                  <tr><td>Heap Used:</td><td id="master-heapUsed">' + EWD.memory.master.heapUsed + '</td></tr>   \
                </table>';
      }
    });

    $('#stopBtn').click(function(e) {
      $('#confirmPanelHeading').text('Attention!');
      $('#confirmPanelQuestion').text('Are you sure you really want to shut down the EWD.js process?');
      $('#confirmPanelOKBtn').text('Yes');
      $('#confirmPanelOKBtn').attr('data-event-type', 'shutdown');
      $('#confirmPanel').modal('show');
      //EWD.stopBtn = 'shutdown';
    });

    $('#confirmPanelOKBtn').click(function(e) {
      var eventType = $('#confirmPanelOKBtn').attr('data-event-type');
      if (eventType === 'shutdown') {
        $('#confirmPanel').modal('hide');
        EWD.sockets.sendMessage({
          type: "EWD.exit", 
          password: EWD.password
        });
        toastr.clear();
        toastr.warning('EWD.js has been stopped');
      }
      if (eventType === 'deleteGlobalNode') {
        var globalName = $('#confirmPanelOKBtn').attr('data-globalName');
        var subscripts = JSON.parse($('#confirmPanelOKBtn').attr('data-subscripts'));
        var xtype = $('#confirmPanelOKBtn').attr('data-x-type');
        //console.log(globalName + ': ' + JSON.stringify(subscripts));
        $('#confirmPanel').modal('hide');
        EWD.sockets.sendMessage({
          type: "deleteGlobalNode", 
          params: {
            globalName: globalName,
            subscripts: subscripts
          }
        });

        var deleteEmptyFolder = function(treeFolderContentNode) {
          if ($(treeFolderContentNode).children().length === 0) {
            var treeFolderNode = $(treeFolderContentNode).parent();
            var treeFolderContentNodeAbove = $(treeFolderNode).parent();
            $(treeFolderNode).remove();
            deleteEmptyFolder(treeFolderContentNodeAbove);
          }
        };

        if (xtype === 'item' || xtype === 'folder') {          
          var treeFolderContentNode = EWD.application.tree.node.parent();
          $(EWD.application.tree.node).remove();
          deleteEmptyFolder(treeFolderContentNode);
        }
      }
    });

    $('#cpStartBtn').click(function(e) {
      EWD.sockets.sendMessage({
        type: "EWD.workerProcess", 
        action:  'add', 
        password: EWD.password
      });
    });

    $('#monitoringLevelBtn').click(function(e) {
      EWD.sockets.sendMessage({
        type: "EWD.getFragment", 
        params:  {
          file: 'monLevel.html',
          targetId: 'InfoPanelText'
        }
      });
    });

    $('#monitoringDestBtn').click(function(e) {
      EWD.sockets.sendMessage({
        type: "EWD.getFragment", 
        params:  {
          file: 'monDest.html',
          targetId: 'InfoPanelText'
        }
      });
    });

    $('#InfoPanelCloseBtn').click(function(e) {
      $('#InfoPanel').modal('hide');
    });

    EWD.stopBtn = false;

  },

  onPageSwap: {

    console: function() {
      $('.console').height($(window).height() - 200);
      //console.log("**** height: " + $('.console').height());
      setTimeout(function() {
        $("#consoleText").animate({ scrollTop: $('#consoleText')[0].scrollHeight}, 5);
     }, 3000);
     $(window).resize(function() {
       $('.console').height($(window).height() - 200);
     });
    },

    db: function() {
      if (EWD.targetIdExists('dbPageLoaded')) {
        $('.fuelux').remove();
        EWD.sockets.sendMessage({
          type: 'getGlobals'
        });
      }
    }
  },

  onFragment: {
    // injected fragments

    'monLevel.html': function(messageObj) {
      $('#InfoPanelTitle').text('Monitoring Level');
      $('#InfoPanelHeading').text('');
      $('#InfoPanel').modal('show');
      $('#monLevel' + EWD.application.traceLevel).prop('checked', true);
      $("input[name=monLevel]").click(function(){
        var level = $('input[name=monLevel]:checked', '#monLevelForm').val();
        $('#InfoPanel').modal('hide');
        EWD.sockets.sendMessage({
            type: 'EWD.setParameter', 
            name: 'monitorLevel', 
            value: level,
	     password: EWD.password
        });
        EWD.application.traceLevel = level;
        toastr.clear();
        toastr.success('Monitoring level reset to ' + level);
      });
    },

    'monDest.html': function(messageObj) {
      $('#InfoPanelTitle').text('Monitoring Destination');
      $('#InfoPanelHeading').text('');
      $('#InfoPanel').modal('show');
      $('#monDest' + EWD.application.logTo).prop('checked', true);
      $('#monDestFileName').val(EWD.application.logFile);
      if (EWD.application.logTo === 'console') $('#monDestFileName').prop("disabled", true);
      $("input[name=monDest]").click(function(){
        var dest = $('input[name=monDest]:checked', '#monDestForm').val();
        if (dest === 'console') {
          $('#InfoPanel').modal('hide');
        }
        else {
          $('#monDestFileName').prop("disabled", false);
        }
        EWD.sockets.sendMessage({
            type: 'EWD.setParameter', 
            name: 'logTo', 
            value: dest,
	     password: EWD.password
        });
        EWD.application.logTo = dest;
        toastr.clear();
        toastr.success('Monitoring destination reset to ' + dest);
      });
      $('#monDestFileName').focusout(function() {
        var filename = $('#monDestFileName').val();
        if (filename !== EWD.application.logFile) {
          EWD.sockets.sendMessage({
            type: 'EWD.setParameter',
            name: 'changeLogFile', 
            value: filename, 
            password: EWD.password
          });
          EWD.application.logFile = filename;
          toastr.clear();
          toastr.success('Monitoring file reset to ' + filename);
        }
      });
    },

    'memory.html': function(messageObj) {
      $('.graph-Container').width($(window).width() * 0.76);
      $('#memoryGraph').width($(window).width() * 0.75);
      var data = EWD.getPlotData('master');
      EWD.plot = $.plot("#memoryGraph", [
          {data: data.rss, label: 'rss'},
          {data: data.heapTotal, label: 'heapTotal'}, 
          {data: data.heapUsed, label: 'heapUsed'} 
        ], {
        series: {
          shadowSize: 0,
          points: {show: true},
          lines: {show: true}
        },
        grid: {
          hoverable: true
        },
        yaxis: {
          min: 0
        },
        xaxis: {
          min: 0,
          max: 60,
          show: true
        }
      });
      EWD.currentGraph = 'master';
      $("<div id='memory-tooltip'></div>").css({
        position: "absolute",
        display: "none",
        border: "1px solid #fdd",
        padding: "2px",
        "background-color": "#fee",
        opacity: 0.80
      }).appendTo("body");
      $("#memoryGraph").bind("plothover", function (event, pos, item) {
        if (item) {
          var x = item.datapoint[0].toFixed(2);
          var y = item.datapoint[1].toFixed(2);
          $("#memory-tooltip").html(item.series.label + ": " + y)
            .css({top: item.pageY+5, left: item.pageX+5})
            .fadeIn(200);
        }
        else {
          $("#memory-tooltip").hide();
        }
      });
      var pname;
      var cls;
      var html;
      for (var name in EWD.memory.plot) {
        pname = name;
        cls = 'btn-success';
        if (name !== 'master') {
          pname = name.split('cpPid')[1];
          cls = 'btn-primary';
        }
        html = '<div><button type="button" class="btn memoryBtn ' + cls + '" id="memoryBtn' + pname + '">' + pname + '</button></div>';
        $('#memory-processes').append(html);
      }
      $('.memoryBtn').click(function(e) {
        var pid = e.target.id.split('memoryBtn')[1];
        //console.log(pid + '; ' + EWD.currentGraph);
        var name = pid;
        if (pid !== 'master') name = 'cpPid' + pid;
        var oldName = EWD.currentGraph;
        if (oldName !== 'master') oldName = EWD.currentGraph.split('cpPid')[1];
        if (name !== EWD.currentGraph) {
          $('#memoryBtn' + pid).addClass('btn-success').removeClass('btn-primary');
          $('#memoryBtn' + oldName).addClass('btn-primary').removeClass('btn-success');
          EWD.currentGraph = name;
          EWD.replotGraph(name);
        }
      });
      $(window).resize(function() {
        if ($('.console').length > 0) {
          $('.console').height($(window).height() - 200);
        }
        if ($('#memoryGraph').length > 0) {
          $('.graph-Container').width($(window).width() * 0.76);
          $('#memoryGraph').width($(window).width() * 0.75);
          EWD.plot.resize();
          EWD.replotGraph(EWD.currentGraph);
        }
      });
      $('#graph-interval').slider({
        value: (EWD.application.interval / 1000) || 30,
        min: 5,
        max: 600,
        step: 5,
        slide: function(event, ui) {
          $( "#graph-interval-value" ).val(ui.value);
        },
        stop: function(event, ui) {
          EWD.sockets.sendMessage({
            type: 'EWD.setParameter',
            name: 'monitorInterval',
            value: ui.value * 1000,
            password: EWD.password
          });
          toastr.clear();
          toastr.success('Monitoring interval reset to ' + ui.value + ' sec');
        }
      });
      $( "#graph-interval-value" ).val(EWD.application.interval / 1000);
    },

    'sessions.html': function(messageObj) {
      EWD.sockets.sendMessage({type: "getSessions"});
    },

    'tree.html': function(messageObj) {
      var msg = EWD.application.messageObj;
      if (msg.message.operation === 'sessionData') {
        $('#sessionDataPanel').show();
        $('#sessionDataTitle').text('Session ' + msg.message.sessid);
      }
      var data;
      if (msg.type === 'getGlobals') {
        data = msg.message;
      }
      else {
        data = msg.message.subscripts;
      }
      EWD.application.tree.treeDataSource = new EWD.application.tree.DataSource({
        data: data,
        delay: 400
      });
      $('#ewd-session-root').tree({dataSource: EWD.application.tree.treeDataSource});
      $('#wait').hide();
      $('.tree-example').on('selected', function (evt, data) {
        // remove the tick if you select an item
        EWD.tree = {evt: evt, data: data};
        $('.icon-ok').removeClass('icon-ok').addClass('tree-dot');
      });
      $('.tree-example').on('opened', function (evt, data) {
        EWD.tree = {evt: evt, data: data};
      });
    },

    'db.html': function(messageObj) {
      $('[data-toggle="tooltip"]').tooltip();
      $('#dbTreePanel').height($(window).height() - 200);
      EWD.sockets.sendMessage({
        type: 'getGlobals'
      });
      $('#dbReloadBtn').on('click', function(e) {
        EWD.sockets.sendMessage({
          type: 'getGlobals'
        });
      });
    },

    'importer.html': function(messageObj) {
      $("#json").keyup(function(e) {
        while($(this).outerHeight() < this.scrollHeight + parseFloat($(this).css("borderTopWidth")) + parseFloat($(this).css("borderBottomWidth"))) {
          $(this).height($(this).height()+1);
        };
      });
      $('#importJSONBtn').on('click', function(e) {
        e.preventDefault(); // prevent default bootstrap behavior
        EWD.sockets.submitForm({
          fields: {
            globalName: $('#globalName').val(),
            json: $('#json').val()
          },
          id: 'jsonForm',
          messageType: 'EWD.form.importJSON'
        });
      });
    }

  },

  onMessage: {

    childProcessMemory: function(messageObj) {
      //{"type":"childProcessMemory","results":{"rss":"37.43","heapTotal":"28.53","heapUsed":"3.55","pid":4848},"interval":30000} 
      if (EWD.memory['cpPid' + messageObj.results.pid]) {
        EWD.memory['cpPid' + messageObj.results.pid] = messageObj.results;
        if ($('#cpPid' + messageObj.results.pid + 'rss')) {
          $('#cpPid' + messageObj.results.pid + 'rss').text(messageObj.results.rss);
          $('#cpPid' + messageObj.results.pid + 'heapTotal').text(messageObj.results.heapTotal);
          $('#cpPid' + messageObj.results.pid + 'heapUsed').text(messageObj.results.heapUsed);
        }
        EWD.memory.plot['cpPid' + messageObj.results.pid].push(messageObj.results);
        if (EWD.memory.plot['cpPid' + messageObj.results.pid].length > 60) EWD.memory.plot['cpPid' + messageObj.results.pid].shift();
        if (EWD.currentGraph === ('cpPid' + messageObj.results.pid)) EWD.replotGraph(EWD.currentGraph);
      }
    },

    consoleText: function(messageObj) {
      var html = '<div>' + messageObj.text + '</div>';
      $('#consoleText').append(html);
      $("#consoleText").animate({ scrollTop: $('#consoleText')[0].scrollHeight}, 5);
      if ($("#consoleText").children().size() > (EWD.maxConsoleLength || 1000)) {
        $('#consoleText').find('div:first').remove();
      }
    },

    getGlobals: function(messageObj) {
      $('.tree-example').remove();
      EWD.application.messageObj = messageObj;
      EWD.sockets.sendMessage({
        type: "EWD.getFragment", 
        params:  {
          file: 'tree.html',
          targetId: 'dbTreePanel'
        }
      });
    },

    getGlobalSubscripts: function(messageObj) {
      if (messageObj.message.rootLevel) {
        $('.tree-example').remove();
        EWD.application.messageObj = messageObj;
        EWD.sockets.sendMessage({
          type: "EWD.getFragment", 
          params:  {
            file: 'tree.html',
            targetId: 'sessionDataTree'
          }
        });
      }
      else {
        EWD.application.tree.callback({data: messageObj.message.subscripts});
        EWD.application.tree.addDeleteButton();
      }
    },

    getInterfaceVersion: function(messageObj) {
      var pieces = messageObj.message.split(';');
      $('#buildVersion-iface').text(pieces[0]);
      $('#buildVersion-db').text(pieces[1]);
    },

    getSessionData: function(messageObj) {
      //console.log("**** session data: " + JSON.stringify(messageObj));
    },

    getSessions: function(messageObj) {
      var html = '';
      var session;
      for (var i = 0; i < messageObj.message.length; i++) {
        session = messageObj.message[i];
        html = html + '<tr class="table" id="session-table-row-' + session.sessid + '">';
        html = html + '<td>' + session.sessid + '</td>';
        html = html + '<td>' + session.appName + '</td>';
        html = html + '<td>' + session.expiry + '</td>';
        html = html + '<td><button class="btn btn-info pull-right sessionDetails" type="button" id="sessionDetailsBtn' + session.sessid + '" data-toggle="tooltip" data-placement="top" title="" data-original-title="Display Session Data"><span class="glyphicon glyphicon-open"></span></button></td>';
        if (!session.currentSession) {
          html = html + '<td><button class="btn btn-danger pull-right sessionStop" type="button" id="sessionStopBtn' + session.sessid + '" data-toggle="tooltip" data-placement="top" title="" data-original-title="Stop Session"><span class="glyphicon glyphicon-remove"></span></button></td>';
        }
        html = html + '</tr>';
      }
      $('#session-table tbody').html(html);
      $('.sessionStop').on('click', function(e) {
        var id = e.target.id;
        if (!id) id = e.target.parentNode.id;
        var sessid = id.split('sessionStopBtn')[1];
        EWD.sockets.sendMessage({
          type: 'closeSession', 
          params: {
            sessid: sessid
          }
        });
        $('#session-table-row-' + sessid).remove();
        toastr.clear();
        toastr.warning('EWD Session ' + sessid + ' has been stopped');
      });

      $('[data-toggle="tooltip"]').tooltip();

      $('.sessionDetails').on('click', function(e) {
        //console.log("getSessionDetails!");
        var id = e.target.id;
        if (!id) id = e.target.parentNode.id;
        var sessid = id.split('sessionDetailsBtn')[1];
        EWD.getGlobalSubscripts({
          rootLevel: true,
          sessid: sessid,
          operation: 'sessionData',
          globalName: '%zewdSession',
          subscripts: ['session', sessid]
        });
      });
    },

    importJSON: function(messageObj) {
      if (messageObj.ok) {
        toastr.clear();
        toastr.success('JSON successfully saved in ' + messageObj.globalName);
      }
    },

    loggedIn: function(messageObj) {
      toastr.options.target = 'body';
      $('#overview_Container').show();
      EWD.password = $('#username').val();
      EWD.sockets.sendMessage({type: "EWD.startConsole", message:  "start", password: EWD.password});
      EWD.sockets.sendMessage({type: "getInterfaceVersion"});
    },

    memory: function(messageObj) {
      EWD.memory.master = messageObj;
      if ($('#master-rss')) {
        $('#master-rss').text(messageObj.rss);
        $('#master-heapTotal').text(messageObj.heapTotal);
        $('#master-heapUsed').text(messageObj.heapUsed);
      }
      EWD.memory.plot.master.push({
        rss: messageObj.rss,
        heapTotal: messageObj.heapTotal,
        heapUsed: messageObj.heapUsed
      });
      if (EWD.memory.plot.master.length > 60) EWD.memory.plot.master.shift();
      if (EWD.currentGraph) EWD.replotGraph(EWD.currentGraph);
    },

    newSession: function(messageObj) {
      console.log("**** new session: " + JSON.stringify(messageObj));
    },

    pidUpdate: function(messageObj) {
      var pid = messageObj.pid;
      $('#cpRequests' + pid).text(messageObj.noOfRequests);
      $('#cpAvailable' + pid).text(messageObj.available);
    },

    processInfo: function(messageObj) {
      var data = messageObj.data;
      EWD.application.traceLevel = data.traceLevel;
      EWD.application.logTo = data.logTo;
      EWD.application.logFile = data.logFile;
      EWD.application.interval = data.interval;
      $('#buildVersion-Node').text(data.nodeVersion);
      $('#buildVersion-ewdgateway2').text(data.build);
      $('#buildVersion-ewdQ').text(data.ewdQBuild);
      $('#buildVersion-EWD').text('EWD.js');
      $('#mainProcess-pid').text(data.masterProcess);
      var childProcesses = messageObj.data.childProcesses;
      var html = '';
      var childProcess;
      var pid;
      for (var i = 0; i < childProcesses.length; i++) {
        childProcess = childProcesses[i];
        pid = childProcess.pid;
        html = html + '<tr class="table" id="cpRow' + pid + '">';
        html = html + '<td class="cpPid" id="cpPid' + pid + '">' + pid + '</td>';
        html = html + '<td id="cpRequests' + pid + '">' + childProcess.noOfRequests + '</td>';
        html = html + '<td id="cpAvailable' + pid + '">' + childProcess.available + '</td>';
        //html = html + '<td><button class="btn btn-danger pull-right cpStop" type="button" id="cpStopBtn' + pid + '">Stop</button></td>';
        html = html + '<td><button class="btn btn-danger pull-right cpStop" type="button" id="cpStopBtn' + pid + '" data-toggle="tooltip" data-placement="top" title="" data-original-title="Stop Child Process"><span class="glyphicon glyphicon-remove"></span></button></td>';
        html = html + '</tr>';
        EWD.memory['cpPid' + pid] = {
          rss: 'Not yet available',
          heapTotal: 'Not yet available',
          heapUsed: 'Not yet available'
        }
        EWD.memory.plot['cpPid' + pid] = [];
      }
      $('#childProcessTable tbody').html(html);
      EWD.enablePopovers();
      $('[data-toggle="tooltip"]').tooltip();
    },

    queueInfo: function(messageObj) {
      $('#masterProcess-qLength').text(messageObj.qLength);
      if (messageObj.qLength > EWD.qMax) {
        EWD.qMax = messageObj.qLength;
        $('#masterProcess-max').text(messageObj.qLength);
      }
    },

    workerProcess: function(messageObj) {
      if (messageObj.action === 'add') {
        var html = EWD.addChildProcessToTable(messageObj.pid);
        $('#childProcessTable tbody').append(html);
        EWD.enablePopovers();
        $('[data-toggle="tooltip"]').tooltip();
      }
    }
  }

};

EWD.sockets.log = false;




