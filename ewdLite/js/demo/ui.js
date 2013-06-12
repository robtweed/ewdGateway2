EWD.application = {
  name: 'tony'
};

EWD.loader = {enabled: false};
EWD.requires = '';
Ext.application({
 name:'EWD Lite Demo Application',
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

EWD.stores = {

  vitalsGridStore: Ext.create('Ext.data.Store', {
    fields: [
      {name: 'BPDiastolic'}, 
      {name: 'BPSystolic'}, 
      {name: 'O2'},
      {name: 'episode'},  
      {name: 'HeartRate'}, 
      {name: 'RespRate'}, 
      {name: 'author'},
      {name: 'datetime'}
    ]
  }),

  patientName: Ext.create('Ext.data.Store', {
    fields: [
      'name',
      'id'
    ],
    data: [
      {  name: 'Select Name',
         id: 'null'
      }
    ]
  })
};

EWD.ext4 = {
  content: function () {
	
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
           title: "EWD Lite Demo Application",
           xtype: "panel",
           tbar: [
             { xtype: 'button', 
               text: 'Select Patient' ,
               handler: function() {
                   Ext.getCmp('selectPatientWindow').show();
               }
             }
           ],
           items: [
             { id: 'patientInfo',
               xtype: 'panel',
               layout: 'column',
               columnWidth: 0.33,
               border: false,
               hidden: true,
               items: [
                 {  columnWidth: 0.33,
                    border: false,
                    items: [
                      {  xtype: 'displayfield',
                         fieldLabel: 'First Name:',
                         value: '',
                         id: 'patient-firstName'
                      }
                    ]
                 },
                 {  columnWidth: 0.33,
                    border: false,
                    items: [
                      {  xtype: 'displayfield',
                         fieldLabel: 'Last Name:',
                         value: '',
                         id: 'patient-lastName'
                      }
                    ]
                 },
                 {  columnWidth: 0.33,
                    border: false
                 }
               ]
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
           xtype: "panel"
        }, 
        {  id: "centerPanel",
           region: "center",
           resizable: true,
           xtype: "tabpanel",
           items: [
             {  id: "mainPanel",
                layout: "fit",
                title: "Vitals",
                xtype: "panel",
                items: [
                  {  frame: true,
                     hidden: true,
                     id: 'vitalsGrid',
                     store: EWD.stores.vitalsGridStore,
                     title: 'Vitals',
                     width: 370,
                     xtype: 'gridpanel',
                     viewConfig: {
                       markDirty: false
                     },
                     columns: [
                       {  dataIndex: 'episode',
                          text: 'Episode',
                          width: 100,
                          xtype: 'gridcolumn'
                       }, 
                       {  dataIndex: 'BPDiastolic',
                          text: 'Diastolic BP',
                          width: 100,
                          xtype: 'gridcolumn'
                       }, 
                       {  dataIndex: 'BPSystolic',
                          text: 'Systolic BP',
                          width: 100,
                          xtype: 'gridcolumn'
                       },
                       {  dataIndex: 'O2',
                          text: 'O2',
                          width: 100,
                          xtype: 'gridcolumn'
                       }, 
                       {  dataIndex: 'HeartRate',
                          text: 'Heart Rate',
                          width: 100,
                          xtype: 'gridcolumn'
                       },
                       {  dataIndex: 'RespRate',
                          text: 'Respiratory Rate',
                          width: 100,
                          xtype: 'gridcolumn'
                       },
                       {  dataIndex: 'author',
                          text: 'Author',
                          width: 100,
                          xtype: 'gridcolumn'
                       },
                       {  dataIndex: 'datetime',
                          text: 'Date/Time',
                          width: 100,
                          xtype: 'gridcolumn'
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
      title: "EWD Lite Demo Application",
      width: 400,
      items: [
        {  bodyPadding: 10,
           xtype: "form",
		   id: 'loginForm',
           items: [
             {  title: "Please log in",
                xtype: "fieldset",
                items: [
                  {  allowBlank: false,
                     fieldLabel: "Username",
                     id: "username",
                     inputType: "text",
                     name: "username",
                     xtype: "textfield"
                  },
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
    

var patientWindow = Ext.create("Ext.window.Window", {
        //autoShow: true,
        hidden: true,
        height: 300,
        id: "selectPatientWindow",
        title: "Select Patient",
        width: 300,
        items: [{
                bodyPadding: 10,
                height: 150,
                id: "selectPatientForm",
                xtype: "form",
                items: [{
                        displayField: "name",
                        enableKeyEvents: true,
                        fieldLabel: "Patient Name",
                        id: "patCombo",
                        name: "patientId",
                        queryMode: "local",
                        store: EWD.stores.patientName,
                        valueField: "id",
                        xtype: "combobox",
                        listeners: {
                            afterrender: function () {
                                //this.triggerWrap.dom.style.display = 'none';
                            },
                            keyup: function (txt) {
                                var value = txt.getValue();
                                if (!value) value = '';
                                if (value !== '') value = value.toLowerCase();
                                //this.triggerWrap.dom.style.display = '';
                                EWD.sockets.sendMessage({
                                  type: "getPatientsByPrefix",
                                  params: {
                                    prefix: value
                                  } 
                                });
                            },
                            blur: function () {
                                //if (this.getValue() === null) this.triggerWrap.dom.style.display = 'none';
                            }
                        }
                    }
                ],
                buttons: [{
                        handler: function () {
                          EWD.sockets.submitForm({
                            id: 'selectPatientForm',
                            alertTitle: 'An error occurred',
                            messageType: 'EWD.form.selectPatient'
                          });
                        },
                        id: "buttonselPatient141",
                        text: "Select",
                        xtype: "button"
                    }
                ]
            }
        ]
    });
    
  
  }  
};
