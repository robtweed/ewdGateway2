EWD.onSocketsReady = function() {
  Ext.getCmp('loginBtn').show();
};

EWD.onSocketMessage = function(messageObj) {
  if (EWD.sockets.trace) console.log("serverMessageHandler: messageObj = " + JSON.stringify(messageObj));

  if (messageObj.type === 'EWD.form.login') {
    if (messageObj.ok) Ext.getCmp('loginPanel').destroy();
  }
  
  if (messageObj.type === 'getPatientsByPrefix') {
    EWD.stores.patientName.loadData(messageObj.message);
  }

  if (messageObj.type === 'EWD.form.selectPatient') {
    if (messageObj.ok) Ext.getCmp('selectPatientWindow').hide();
  }

  if (messageObj.type === 'patientDocument') {
    console.log(JSON.stringify(messageObj.message));
    EWD.patient = messageObj.message;
    Ext.getCmp('patient-firstName').setValue(EWD.patient.firstName);
    Ext.getCmp('patient-lastName').setValue(EWD.patient.lastName);
    Ext.getCmp('patientInfo').show();
    EWD.stores.vitalsGridStore.loadData(EWD.patient.vitals);
    Ext.getCmp('vitalsGrid').show();
  }
  
};