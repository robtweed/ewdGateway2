/*
This example exercises and demonstrates the Mumps OO APIs.

Before running this example, you must have run phoenixExample1.js which creates the ^patient Global
against which the APIs will be run

*/

//initialise interface etc

var ewd = require('../ewdGlobals');

// For GT.M:
var globals = require('/home/vista/mumps');
var db = new globals.Gtm();
db.open();

/*
 // For Cache / GlobalsDB:
var globals = require("c:\\Program Files\\nodejs\\cache");
var db = new globals.Cache();
var params = {
  path:"c:\\InterSystems\\Cache\\Mgr",
  username: "_SYSTEM",
  password: "SYS",
  namespace: "USER"
};
db.open(params);
*/

ewd.init(db);

// initialisation complete

var patient = new ewd.GlobalNode("patient", [123456]);
var dummy = new ewd.GlobalNode("nonExistent", ["b","c"]);


console.log("Running Mumps OO APIs for GlobalNode('patient', [123456])")

console.log("_globalName: " + patient._globalName);
console.log("=============================");

console.log("_subscripts: " + JSON.stringify(patient._subscripts));
console.log("=============================");

console.log("_node: " + JSON.stringify(patient._node));
console.log("=============================");

console.log("_exists (does this Global Node physically exist on disk?): " + patient._exists);
console.log("=============================");

console.log("does the dummy global exist on disk?: " + dummy._exists);
console.log("=============================");

console.log("_hasValue (does this Global Node have a value on disk?): " + patient._hasValue);
console.log("=============================");

console.log("How about patient.$('gender')?: " + patient.$('gender')._hasValue);
console.log("=============================");

console.log("_hasProperties (does this Global Node have lower-level properties/subscripts?): " + patient._hasProperties);
console.log("=============================");

console.log("How about patient.gender?: " + patient.gender._hasProperties);
console.log("We can now dispense with $('gender') because this property has now been instantiated for patient");
console.log("=============================");

console.log("_value (what's the value on disk of this Global Node?): " + patient._value);
console.log("=============================");

console.log("How about patient.gender?: " + patient.gender._value);
console.log("=============================");

console.log("Let's change the patient's gender:")
patient.gender._value = 'M';
console.log("Patient's gender is now: " + patient.gender._value);
console.log("=============================");


console.log("Properties/subscripts for patient:")
patient._forEach(function(key, subNode, me) {
 console.log(key);
 // subNode is the globalNode representing ^patient(123456,key)
 // me is a pointer to this (ie in this case, patient)
});
console.log("=============================");

console.log("1st and 2nd-level Properties/subscripts for patient:")
patient._forEach(function(key, subNode, me) {
 subNode._forEach(function(key2, subNode2, me2) {
   console.log(key + "; " + key2);
 });
});
console.log("=============================");

console.log("Properties/subscripts for patient between et and med:")
patient._forRange('et', 'med', function(key, subNode, me) {
 console.log(key);
 // subNode is the globalNode representing ^patient(123456,key)
 // me is a pointer to this (ie in this case, patient)
});
console.log("=============================");

console.log("Properties/subscripts for patient starting with e:")
patient._forPrefix('e', function(key, subNode, me) {
 console.log(key);
 // subNode is the globalNode representing ^patient(123456,key)
 // me is a pointer to this (ie in this case, patient)
});
console.log("=============================");

console.log("_count() (number of properties/subscripts for this GlobalNode): " + patient._count());
console.log("=============================");

console.log("_parent (parent GlobalNode for patient.gender): " + JSON.stringify(patient.gender._parent));
console.log("=============================");

console.log("_first (first properties/subscript for patient GlobalNode): " + patient._first);
console.log("=============================");

console.log("_last (last properties/subscript for patient GlobalNode): " + patient._last);
console.log("=============================");

console.log("_next() (properties/subscript for patient GlobalNode following gender): " + patient._next('gender'));
console.log("=============================");

console.log("_previous() (properties/subscript for patient GlobalNode preceding gender): " + patient._previous('gender'));
console.log("=============================");

console.log("using increment() to create a persistent counter:");

var counter = new ewd.GlobalNode("myCounter", ["demo"]);
counter._increment();
console.log("counter = " + counter._value);
counter._increment();
console.log("counter = " + counter._value);
console.log("=============================");

console.log("delete the counter: ")
counter._delete();
console.log("counter exists on disk?: " + counter._exists);

console.log("=============================");

console.log("Run an existing Mumps function: ")
var version = ewd.function("version^%zewdAPI");
console.log("EWD version = " + version);
console.log("=============================");

console.log("...and one that takes arguments: ")
var date = ewd.function("inetDate^%zewdAPI",62851);
console.log("Date = " + date);
console.log("=============================");



db.close();





