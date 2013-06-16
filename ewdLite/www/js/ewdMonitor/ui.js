EWD.application = {
  name: 'ewdMonitor'
};

EWD.loader = {enabled: false};
EWD.requires = '';
Ext.application({
 name:'EWD Monitor',
 launch: function() {
   if (EWD.loader.enabled) Ext.Loader.setConfig(EWD.loader);
   if (EWD.requires !== '') {
     Ext.require(EWD.requires, function() {EWD.ext4.content()});
   }
   else {
     EWD.ext4.content()
   }
 }
});

EWD.stores = {};

EWD.ext4 = {
  content: function () {
  
    Ext.define('memoryGridModel', {
      extend: 'Ext.data.Model',
      fields: [
        {name: 'rowNo'}, 
        {name: 'mb'},
        {name: 'type'}
      ]
    });
  
    EWD.stores.memoryGridStore = Ext.create('Ext.data.Store', {
      model: 'memoryGridModel',
      id: 'memoryGridStore'
    });
		
	var moduleStore = Ext.create('Ext.data.TreeStore', {
      id: "moduleStore",
      root: {
        children: [
          {children: [
            {children: [
                {leaf: true,
                 nvp: "ewdgateway2^ewdGW2Mgr^c:\\Program Files\\nodejs\\ewdGW2Mgr.js",
                 replace: 0,
                 text: "ewdGW2Mgr: c:\\Program Files\\nodejs\\ewdGW2Mgr.js"
                }
              ],
              expanded: true,
              replace: 0,
              text: "ewdgateway2"
             }, 
             {children: [
                {leaf: true,
                 nvp: "google^scheduling^c:\\Program Files (x86)\\nodejs\\scheduling.js",
                 replace: 0,
                 text: "scheduling: c:\\Program Files (x86)\\nodejs\\scheduling.js"
                }
              ],
              expanded: true,
              replace: 0,
              text: "google"
             }, 
             {children: [
		        {leaf: true,
                 nvp: "scheduling^scheduling^c:\\Program Files\\nodejs\\scheduling.js",
                 replace: 0,
                 text: "scheduling: c:\\Program Files\\nodejs\\scheduling.js"
                }
              ],
              expanded: true,
              replace: 0,
              text: "scheduling"
             }
           ],
           expanded: true,
           replace: 0,
           text: "Applications"
          }
        ],
        expanded: true
      }
    });
    
    Ext.define('buildGridModel', {
      extend: 'Ext.data.Model',
      fields: [
        {  name: 'rowNo'}, 
        {  name: 'name'}, 
        {  name: 'version'}
      ]
    });
    
    EWD.stores.buildStore = Ext.create('Ext.data.Store', {
      model: 'buildGridModel',
      id: 'buildStore',
      data: [
        {  rowNo: 0,
           name: 'Node.js',
           version: ''
        }, 
        {  rowNo: 1,
           name: 'ewdGateway2',
           version: ''
        }, 
        {  rowNo: 2,
           name: 'ewdQ',
           version: ''
        }, 
        {  rowNo: 3,
           name: 'EWD',
           version: ''
        }, 
        {  rowNo: 4,
           name: 'Adaptor',
           version: ''
        }, 
        {  rowNo: 5,
           name: 'Database',
           version: ''
        }
      ]
    });

    Ext.define('qGridModel', {
      extend: 'Ext.data.Model',
      fields: [
        {  name: 'rowNo'}, 
        {  name: 'length'}, 
        {  name: 'max'}
      ]
    });

    EWD.stores.queueStore = Ext.create('Ext.data.Store', {
      model: 'qGridModel',
      id: 'queueStore',
      data: [
        {  rowNo: 0,
           length: 0,
           max: 0
        }
      ]
    });
     
    Ext.define('childProcessGridModel', {
      extend: 'Ext.data.Model',
      fields: [
        {name: 'rowNo'}, 
        {name: 'available'}, 
        {name: 'noOfRequests'}, 
        {name: 'pid'}
      ]
    });
    
    EWD.stores.childProcesses = Ext.create('Ext.data.Store', {
      model: 'childProcessGridModel',
      id: 'childProcesses'
    });
     	
    Ext.define('sessionGridModel', {
      extend: 'Ext.data.Model',
      fields: [
        {name: 'rowNo'}, 
        {name: 'appName'}, 
        {name: 'currentSession'}, 
        {name: 'expiry'}, 
        {name: 'sessid'}
      ]
    });
     
    EWD.stores.sessionGridStore = Ext.create('Ext.data.Store', {
      model: 'sessionGridModel',
      id: 'sessionGridStore'
    });
    
    Ext.define('memoryHistoryModel', {
      extend: 'Ext.data.Model',
      fields: [
        {name: 'heapTotal'}, 
        {name: 'heapUsed'}, 
        {name: 'rss'}, 
        {name: 'timeslot'}
      ]
    });
     
    EWD.stores.memoryHistory = Ext.create('Ext.data.Store', {
      model: 'memoryHistoryModel',
      id: 'memoryHistoryStore'
    });
	
    var updateMemoryGrid = function(storeItem, item) {
      this.setTitle('Time sample ' + storeItem.get('timeslot'));
      EWD.stores.memoryGridStore.getAt(0).set('mb',storeItem.get('rss'));
      EWD.stores.memoryGridStore.getAt(1).set('mb',storeItem.get('heapTotal'));
      EWD.stores.memoryGridStore.getAt(2).set('mb',storeItem.get('heapUsed'));
    }; 
   
    var chartTip1 = {
      trackMouse: true,
      width: 220,
      height: 170,
      layout: 'fit',
      listeners: {
        show: function(me) {
          me.add(Ext.getCmp('memoryGrid'));
        },
        hide: function(me) {
          me.remove(Ext.getCmp('memoryGrid'), false);
        }
      },
      renderer: updateMemoryGrid 
    };

    var chartTip2 = {
      trackMouse: true,
      width: 220,
      height: 170,
      layout: 'fit',
      listeners: {
        show: function(me) {
          me.add(Ext.getCmp('memoryGrid'));
        },
        hide: function(me) {
          me.remove(Ext.getCmp('memoryGrid'), false);
        }
      },
      renderer: updateMemoryGrid
    };

    var chartTip3 = {
      trackMouse: true,
      width: 220,
      height: 170,
      layout: 'fit',
      listeners: {
        show: function(me) {
          me.add(Ext.getCmp('memoryGrid'));
        },
        hide: function(me) {
          me.remove(Ext.getCmp('memoryGrid'), false);
        }
      },
      renderer: updateMemoryGrid
    };
	
	 Ext.create("Ext.container.Viewport", {
      layout: "border",
      renderTo: Ext.getBody(),
      items: [
        {  autoHeight: true,
           border: false,
           height: 250,
           id: "northPanel",
           margins: "0 0 5 0",
           overflowY: "auto",
           region: "north",
           resizable: true,
           title: "ewdGateway2 Manager",
           xtype: "panel",
           items: [
             {  xtype: 'panel',
                border: false,
                id: 'processPanel',
			    layout: 'hbox',
                title: 'Process Information',
                width: '100%',
                items: [
                  {  frame: true,
                     id: 'buildGrid',
                     store: EWD.stores.buildStore,
                     title: 'Build Details',
                     width: 370,
                     xtype: 'gridpanel',
                     viewConfig: {
                       markDirty: false
                     },
                     columns: [
                       {  dataIndex: 'name',
                          text: 'Module',
                          width: 100,
                          xtype: 'gridcolumn'
                       }, 
                       {  dataIndex: 'version',
                          text: 'Version/Build',
                          width: 250,
                          xtype: 'gridcolumn'
                       }
                     ]
                  }, 
                  {  frame: true,
                     id: 'qGrid',
                     store: EWD.stores.queueStore,
                     title: 'Master Process: ',
                     width: 170,
                     xtype: 'gridpanel',
                     tools: [
                       {  handler: function () {
                            EWD.stores.queueStore.getAt(0).set('max', 0);
                          },
                          tooltip: 'Reset maximum',
                          type: 'down',
                          xtype: 'tool'
                       }
                     ],
                     dockedItems: [
                       {  dock: 'top',
                          xtype: 'toolbar',
                          items: [
                            {  handler: function () {
                                 exitNode();
                               },
                               text: 'Stop Node.js Process',
                               xtype: 'button'
                            }
                          ]
                       }
                     ],
                     viewConfig: {
                       markDirty: false
                     },
                     columns: [
                       {  dataIndex: 'length',
                          text: 'Queue Length',
                          width: 80,
                          xtype: 'gridcolumn'
                       }, 
                       {  dataIndex: 'max',
                          text: 'Maximum',
                          width: 70,
                          xtype: 'gridcolumn'
                       }
                     ]
                  }, 
                  {  frame: true,
                     id: 'childProcessGrid',
                     store: EWD.stores.childProcesses,
                     title: 'Worker Processes:',
                     width: 210,
                     xtype: 'gridpanel',
                     tools: [
                       {  handler: function () {
                            workerProcess('add');
                          },
                          tooltip: 'Add an new extra worker process',
                          type: 'plus',
                          xtype: 'tool'
                       }, 
                       {  handler: function () {
                            workerProcess('remove');
                          },
                          tooltip: 'Stop a worker process and reduce pool size by 1',
                          type: 'minus',
                          xtype: 'tool'
                       }
                     ],
                     viewConfig: {
                       markDirty: false
                     },
                     columns: [
                       {  dataIndex: 'pid',
                          hideable: false,
                          sortable: false,
                          text: 'pid',
                          width: 50,
                          xtype: 'gridcolumn'
                       }, 
                       {  dataIndex: 'noOfRequests',
                          text: 'Requests',
                          width: 70,
                          xtype: 'gridcolumn'
                       }, 
                       {  dataIndex: 'available',
                          falseText: 'No',
                          text: 'Available',
                          trueText: 'Yes',
                          width: 70,
                          xtype: 'booleancolumn'
                       }
                     ]
                  }
                ],
                listeners: {
                  afterrender: function () {
                    //startConsole()
                  }
                }
             }
           ]
        }, 
        {  autoHeight: true,
           border: false,
           collapsible: true,
           id: "westPanel",
           region: "west",
           resizable: true,
           width: 250,
           xtype: "panel",
           layout: {
             activeontop: true,
             animate: true,
             titleCollapse: false,
             type: "accordion"
           },
           items: [
             {  id: "devToolsPanel",
                title: "Developer Tools Options",
                xtype: "panel",
                layout: {
                  align: "center",
                  type: "vbox"
                },
                defaults: {
                  margin: "10 0 0 0"
                },
                items: [
                  {  handler: function (button) {
                       devToolsLogging(button);
                     },
                     id: "devToolLogOnBtn",
                     text: "Console Logging On",
                     xtype: "button"
                  }
                ]
             }, 
             {  id: "modulePanel",
                layout: "fit",
                title: "Modules",
                xtype: "panel",
                items: [
                  {  flex: 1,
                     id: "moduleMenu",
                     rootVisible: false,
                     store: moduleStore,
                     title: "Javascript Modules",
                     width: "100%",
                     xtype: "treepanel",
                     listeners: {
                       itemClick: function (node, record) {
                         moduleHandler(record);
                       }
                     }
                  }
                ]
             }
           ]
        }, 
        {  id: "centerPanel",
           region: "center",
           resizable: true,
           xtype: "tabpanel",
           items: [
             {  id: "mainPanel",
                layout: "fit",
                title: "Live Node.js Console",
                xtype: "panel",
                items: [
                  {  align: "stretch",
                     layout: "vbox",
                     xtype: "panel",
                     items: [
                       {  border: false,
                          contentEl: "consoleText",
                          flex: 1,
                          id: "console",
                          margin: 5,
                          overflowY: "scroll",
                          width: "100%",
                          xtype: "panel"
                       }, 
                       {  border: false,
                          height: 100,
                          layout: "column",
                          title: "Logging/Monitoring Settings",
                          width: "100%",
                          xtype: "form",
                          items: [
                            {  columnWidth: 0.4,
                               layout: "fit",
                               title: "Logging Level",
                               xtype: "fieldset",
                               items: [
                                 {  id: "loggingLevel",
                                    xtype: "radiogroup",
                                    items: [
                                      {  boxLabel: "None",
                                         checked: '' === '0',
                                         inputValue: 0,
                                         name: "level",
                                         xtype: "radiofield"
                                      }, 
                                      {  boxLabel: "Min",
                                         checked: '' === '1',
                                         inputValue: 1,
                                         name: "level",
                                         xtype: "radiofield"
                                      }, 
                                      {  boxLabel: "Med",
                                         checked: '' === '2',
                                         inputValue: 2,
                                         name: "level",
                                         xtype: "radiofield"
                                      }, 
                                      {  boxLabel: "Max",
                                         checked: '' === '3',
                                         inputValue: 3,
                                         name: "level",
                                         xtype: "radiofield"
                                      }
                                    ],
                                    listeners: {
                                      change: function (radio, value) {
                                        setMonitorLevel(value.level);
                                      }
                                    }
                                 }
                               ]
                            }, 
                            {  columnWidth: 0.6,
                               layout: "column",
                               title: "Logging Destination",
                               xtype: "fieldset",
                               items: [
                                 {  columnWidth: 0.4,
                                    id: "logToGroup",
                                    xtype: "radiogroup",
                                    items: [
                                      {  boxLabel: "Console",
                                         checked: '' === 'console',
                                         inputValue: "console",
                                         name: "logTo",
                                         xtype: "radiofield"
                                      }, 
                                      {  boxLabel: "File",
                                         checked: '' === 'file',
                                         inputValue: "file",
                                         name: "logTo",
                                         xtype: "radiofield"
                                      }
                                    ],
                                    listeners: {
                                      change: function (radio, value) {
                                        setLogTo(value.logTo);
                                      }
                                    }
                                 }, 
                                 {  columnWidth: 0.45,
                                    id: "logFilePath",
                                    name: "logFilePath",
                                    xtype: "textfield"
                                 }, 
                                 {  columnWidth: 0.15,
                                    hidden: true,
                                    id: "logFileOptionBtn",
                                    text: "Options",
                                    xtype: "splitbutton",
                                    menu: [
                                      {  handler: function () {
                                           clearLogFile()
                                         },
                                         text: "Clear",
                                         tooltip: "Clear down log file",
                                         xtype: "menuitem"
                                      }, 
                                      {  handler: function () {
                                           changeLogFile()
                                         },
                                         text: "Change",
                                         tooltip: "Change logging to the specified file",
                                         xtype: "menuitem"
                                      }
                                    ]
                                 }
                               ]
                            }
                          ]
                       }
                     ]
                  }
                ]
             }, 
             {  id: "memoryChartPanel",
                layout: "fit",
                title: "Memory Use",
                xtype: "panel",
                items: [
                  {  xtype: 'panel',
                     align: "stretch",
                     layout: "vbox",
                     items: [
                       {  animate: true,
                          flex: 1,
                          id: "memoryChart",
                          store: EWD.stores.memoryHistory,
                          width: "100%",

                          xtype: "chart",
                          axes: [
                            {  fields: ['rss', 'heapTotal', 'heapUsed'],
                               grid: true,
                               minimum: 0,
                               position: "left",
                               title: "Memory (Mb)",
                               type: "Numeric"
                            }, 
                            {  fields: ['timeslot'],
                               grid: true,
                               id: "timeSlotAxis",
                               maximum: 60,
                               minimum: 1,
                               position: "bottom",
                               title: "Time Interval",
                               type: "Numeric"
                            }
                          ],
                          series: [
                            {  axis: "left",
                               highlight: true,
                               tips: chartTip1,
                               type: "line",
                               xField: "timeslot",
                               yField: "rss"
                            }, 
                            {  axis: "left",
                               tips: chartTip2,
                               type: "line",
                               xField: "timeslot",
                               yField: "heapTotal"
                            }, 
                            {  axis: "left",
                               tips: chartTip3,
                               type: "line",
                               xField: "timeslot",
                               yField: "heapUsed"
                            }
                          ],
                          legend: {
                            position: "right"
                          }
                       }, 
                       {  border: false,
                          height: 70,
                          layout: "hbox",
                          width: "100%",
                          xtype: "form",
                          items: [
                            {  fieldLabel: "Monitor Interval (sec)",
                               id: "interval",
                               increment: 5,
                               labelWidth: 150,
                               maxValue: 1100,
                               minValue: 5,
                               value: 0,
                               width: 600,
                               xtype: "slider",
                               listeners: {
                                 changecomplete: function (slider, value) {
                                   Ext.getCmp('intervalDisplay').setValue(value);
                                   EWD.sockets.sendMessage({
                                     type: 'EWD.setParameter',
                                     name: 'monitorInterval',
                                     value: value * 1000,
                                     password: EWD.password
                                   });
                                 }
                               }
                            }, 
                            {  id: "intervalDisplay",
                               inputwidth: 30,
                               margin: "0 0 0 10",
                               name: "intervalDisplay",
                               readOnly: true,
                               value: 0,
                               xtype: "textfield"
                            }
                          ]
                       }
                     ]
                  }
                ],
                listeners: {
                  afterrender: function () {
                    //Ext.getCmp('interval').setValue(logging.interval);
                    //Ext.getCmp('intervalDisplay').setValue(logging.interval);
                  }
                }
             }, 
             {  id: "sessionTabPanel",
                layout: "fit",
                title: "EWD Sessions",
                xtype: "panel",
				items: [
                  {  xtype: 'panel',
                     align: "stretch",
                     id: "sessionPanel",
                     layout: "hbox",
                     listeners: {
                       afterrender: function () {
                         //setSessionGridHeight();
                         //timedUpdate()
                       }
                     },
                     items: [
                       {  frame: true,
                          id: "sessionGrid",
                          scroll: true,
                          store: EWD.stores.sessionGridStore,
                          width: 520,
                          xtype: "gridpanel",
                          viewConfig: {
                            markDirty: false
                          },
                          columns: [
                            {  dataIndex: "sessid",
                               text: "Session Id",
                               width: 80,
                               xtype: "gridcolumn"
                            }, 
                            {  dataIndex: "appName",
                               text: "Application",
                               width: 150,
                               xtype: "gridcolumn"
                            }, 
                            {  dataIndex: "expiry",
                               text: "Expiry",
                               width: 200,
                               xtype: "gridcolumn"
                            }, 
                            {  width: 50,
                               xtype: "actioncolumn",
                               items: [
                                 {  getClass: function (v, m, rec) {
                                      if (rec.data.currentSession) return 'x-hide-display';
                                    },
                                    handler: function (vw, rx, cx, item, ev, rec) {
                                      console.log('closing session ' + rec.data.sessid);
                                      closeSession(rec.data.sessid);
                                    },
                                    icon: "http://cdn.sencha.io/ext-4.1.1-gpl/examples/shared/icons/fam/delete.gif",
                                    tooltip: "Close down EWD Session"
                                 }, 
                                 {  handler: function (vw, rx, cx, item, ev, rec) {
                                      getSessionData(rec.data.sessid);
                                    },
                                    icon: "http://cdn.sencha.io/ext-4.1.1-gpl/examples/shared/icons/fam/folder_go.png",
                                    tooltip: "Display EWD Session Contents"
                                 }
                               ]
                            }
                          ]
                        }, 
                       {  align: "stretch",
                          border: false,
                          id: "sessionTreePanel",
                          layout: "fit",
                          xtype: "panel",
                          items: [
                            {  flex: 1,
                               id: "sessionTree",
                               xtype: "panel"
                            }
                          ]
                       }
                     ]
                  }
                ]				
             },
             {  id: "globalTabPanel",
                layout: "fit",
                title: 'Persistent Objects',
                xtype: "panel",
				items: [
                  {  flex: 1,
                     tbar: [
                       {  xtype: 'button', 
                          text: 'Refresh',
                          handler: function() {
                            EWD.sockets.sendMessage({type: 'getGlobals'});
                          }
                       }
                     ],
                     id: "globalMenu",
                     rootVisible: true,
                     root: {
                       text: "Objects",
                       expanded: true,
                     },
                     width: "100%",
                     xtype: "treepanel",
                     listeners: {
                       checkchange: function (node, checked) {
                         if (checked) {
                           deleteGlobalNode(node);
                         }
                       },
                       itemExpand: function(node) {
                         console.log('item expanded! ' + node.data.text);
                         EWD.node = node;
                         if (node.raw.fetched) return;
                         node.raw.fetched = true;
                         if (node.data.parentId === 'root') {
                           getGlobalSubscripts({
                             nodeId: node.data.id,
                             globalName: node.data.text,
                             subscripts: []
                           });
                         }
                         else {
                           getGlobalSubscripts({
                             nodeId: node.data.id,
                             globalName: node.raw.globalName,
                             subscripts: JSON.parse(node.raw.subscripts)
                           });
                         }
                       }
                     }
                  }
				]             
             },
             {  id: "exportTabPanel",
                //layout: "fit",
                title: 'Export/Import',
                xtype: "panel",
				items: [
                  {  //flex: 1,
                     bodyPadding: 10,
                     height: 150,
                     xtype: "form",
                     border: false,
		             id: 'importForm',
                     items: [
                       {  title: "Enter the filename containing the Objects you wish to import",
                          xtype: "fieldset",
                          items: [
                            {  allowBlank: false,
                               fieldLabel: "File Path",
                               id: "importPath",
                               inputType: "text",
                               name: "importPath",
                               xtype: "textfield",
                               width: 400
                            },
                            {  id: "format",
                               xtype: "radiogroup",
                               fieldLabel: 'Format: ',
                               items: [
                                 {  boxLabel: "GT.M",
                                    checked: true,
                                    inputValue: 'gtm',
                                    name: "format",
                                    xtype: "radiofield"
                                 }
                               ]
                            } 
                          ]
                       }
                     ],
                     buttons: [
                       {  handler: function () {
                            EWD.sockets.submitForm({
                              id: 'importForm',
                              alertTitle: 'An error occurred',
                              messageType: 'EWD.form.import'
                            });
				          },
                          text: "Import",
                          xtype: "button",
                          id: 'importBtn'
                       }
                     ]
                  }
                ]
             } 
           ]
        }
      ]
    });
    
    Ext.create("Ext.window.Window", {
      autoShow: true,
      height: 200,
      id: "loginPanel",
      layout: "fit",
      modal: true,
      closable: true,
      renderTo: Ext.getBody(),
      title: "ewdGateway2 Manager",
      width: 400,
      items: [
        {  bodyPadding: 10,
           xtype: "form",
		   id: 'loginForm',
           items: [
             {  title: "See ewdGateway2 startup file for password",
                xtype: "fieldset",
                items: [
                  {  allowBlank: false,
                     fieldLabel: "Password",
                     id: "password",
                     inputType: "password",
                     name: "password",
                     xtype: "textfield"
                  }
                ]
             }
           ],
           buttons: [
             {  handler: function () {
                  if (!EWD.initialised) {
                    Ext.Msg.alert('WebSocket connection not initialised: please wait a few seconds and try again'); 
                    closeMsg();
                    return;
                  }
                  EWD.sockets.submitForm({
                    id: 'loginForm',
                    alertTitle: 'An error occurred',
                    messageType: 'EWD.form.login'
                  });
				},
                text: "Login",
                xtype: "button",
                id: 'loginBtn',
                hidden: true
             }
           ]
        }
      ]
    });
    
    var memoryGrid = Ext.create("Ext.grid.Panel", {
      frame: true,
      id: "memoryGrid",
      store: EWD.stores.memoryGridStore,
      title: "Memory Utilisation",
      width: 200,
      viewConfig: {
        markDirty: false
      },
      columns: [
        {  dataIndex: "type",
           text: "Type",
           width: 80,
           xtype: "gridcolumn"
        }, 
        {  dataIndex: "mb",
           text: "Used (Mb)",
           width: 100,
           xtype: "numbercolumn"
        }
      ]
    });
  
  }  
};
