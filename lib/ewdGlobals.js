/*

 ----------------------------------------------------------------------------
 | ewdGlobals: Node.js OO projection of Mumps Globals                       |
 |                                                                          |
 | Copyright (c) 2013 M/Gateway Developments Ltd,                           |
 | Reigate, Surrey UK.                                                      |
 | All rights reserved.                                                     |
 |                                                                          |
 | http://www.mgateway.com                                                  |
 | Email: rtweed@mgateway.com                                               |
 |                                                                          |
 |                                                                          |
 | Licensed under the Apache License, Version 2.0 (the "License");          |
 | you may not use this file except in compliance with the License.         |
 | You may obtain a copy of the License at                                  |
 |                                                                          |
 |     http://www.apache.org/licenses/LICENSE-2.0                           |
 |                                                                          |
 | Unless required by applicable law or agreed to in writing, software      |
 | distributed under the License is distributed on an "AS IS" BASIS,        |
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. |
 | See the License for the specific language governing permissions and      |
 |  limitations under the License.                                          |
 ----------------------------------------------------------------------------

  Build 6; 26 January 2013

*/

var ewd = {};

var init = function(db) {
  ewd.mumps = db;
};

var deleteGlobal = function(globalName) {
  new Global(globalName)._delete();
};

var fn = function(funcName) {
  var args = [];
  var i;
  if (arguments.length > 1) {
    for (i = 1; i < arguments.length; i++) {
      args.push(arguments[i]);
    }
  }
  return ewd.mumps.function({function: funcName, arguments: args}).result;
};

var MumpsFn = function(funcName) {
  this.execute = function() {
    var args = [];
    var i;
    for (i = 0; i < arguments.length; i++) {
      args.push(arguments[i]);
    }
    return ewd.mumps.function({function: funcName, arguments: args}).result;
  };
  this.run = this.execute;
};

var deleteGlobalNode = function(globalName, subscripts) {
  new GlobalNode(globalName, subscripts)._delete();
};

var Global = function(globalName) {
  return new GlobalNode(globalName,[]);
};

var GlobalNode = function(globalName, subscripts) {

  this._node = {global: globalName, subscripts: subscripts};
  // this.subscripts returns a clone of the subscripts array
  this._subscripts = subscripts.slice(0);
  this._globalName = globalName;

  // Object.defineProperty is used where we need to invoke every time
  // rather than use value frozen on instantiation

  Object.defineProperty(this, '_defined', {
    enumerable: true,
    configurable: false,
    get: function() {
      return ewd.mumps.data(this._node).defined;
    }
  });

  Object.defineProperty(this, '_exists', {
    enumerable: true,
    configurable: false,
    get: function() {
      return this._defined !== 0;
    }
  });

  Object.defineProperty(this, '_hasValue', {
    enumerable: true,
    configurable: false,
    get: function() {
      return ((this._defined === 1)||(this._defined === 11));
    }
  });

  Object.defineProperty(this, '_hasProperties', {
    enumerable: true,
    configurable: false,
    get: function() {
      return ((this._defined === 10)||(this._defined === 11));
    }
  });

  this._keys = Object.keys(this).slice(0);

  Object.defineProperty(this, '_reservedNames', {
    enumerable: false,
    configurable: false,
    get: function() {
      var i;
      var names = {};
      for (i = 0; i < this._keys.length; i++) {
        names[this._keys[i]] = '';
      }
      return names;
    }
  });

  this._getValue = function() {
    return this._value;
  };

  this._setValue = function(value) {
    this._value = value;
  };

  Object.defineProperty(this, '_value', {
    enumerable: true,
    configurable: false,
    get: function() {
      return ewd.mumps.get(this._node).data;
    },
    set: function(value) {
      var node = {global: globalName, subscripts: subscripts, data: value};
      ewd.mumps.set(node);
    }
  });

  this._property = function(subscript) {
    // don't overwrite a global node's preset properties or methods
    if (subscript in this._reservedNames) return false;
    var subs = this._subscripts.slice(0);
    subs.push(subscript);
    if (typeof this[subscript] === 'undefined') this[subscript] = new GlobalNode(globalName,subs);
    return this[subscript];
  };

  this.$ = this._property;
  this._getProperty = this._property;

  this._getProperties = function() {
    var properties = [];
    this._forEach(function(key, subNode, node) {
      properties.push(key);
      node.$(key);
    });
    return properties;
  };

  this._setPropertyValue = function(subscript, value) {
    var subs = this._subscripts.slice(0);
    subs.push(subscript);
    var node = {global: globalName, subscripts: subs, data: value};
    ewd.mumps.set(node);
  };

  this._fixProperties = function() {
    
    var findProperties = function(globalNode) {
      globalNode._forEach(function(key,subNode, node) {
        if (subNode._hasProperties) {
          findProperties(node.$(key));
        }
      });
      return globalNode;
    };

   return findProperties(this);

  };

  this._forEach = function(callback) {
    var result;
    var gnode;
    var subs = this._subscripts.slice(0);
    subs.push('');
    var node = {global: globalName, subscripts: subs};
    do {
      node = ewd.mumps.order(node);
      result = node.result;
      if (result !== '') {
        gnode = this.$(result);
        callback(result, gnode, this);
      }
    }
    while (result !== '');
  };

  this._forRange = function(fromSubscript, toSubscript, callback) {
    var end = '';
    var result;
    var gnode;
    var subs;
    var node;
    if (toSubscript !== '') {
      subs = this._subscripts.slice(0);
      subs.push(toSubscript);
      node = {global: globalName, subscripts: subs};
      end = ewd.mumps.order(node).result;
    }
    subs = this._subscripts.slice(0);
    subs.push(fromSubscript);
    node = {global: globalName, subscripts: subs};
    var seed = ewd.mumps.previous(node).result;
    do {
      node = ewd.mumps.order(node);
      result = node.result;
      if (result !== end) {
        gnode = this.$(result);
        callback(result, gnode, this);
      }
    }
    while (result !== end);
  };

  this._forPrefix = function(prefx, callback) {
    var end = '';
    var result;
    var gnode;
    var subs;
    var node;
    if (prefx === '') return;
    subs = this._subscripts.slice(0);
    subs.push(prefx);
    node = {global: globalName, subscripts: subs};
    node = ewd.mumps.previous(node);
    var seed = node.result;
    subs = this._subscripts.slice(0);
    subs.push(seed);
    node = {global: globalName, subscripts: subs};
    do {
      node = ewd.mumps.order(node);
      result = node.result;
      if (result !== '') {
        if (result.indexOf(prefx) === -1) break;
        gnode = this.$(result);
        callback(result, gnode, this);
      }
    }
    while (result !== '');
  };

  this._count = function() {
    var count = 0;
    this._forEach(function(key) {
      count++;
    });
    return count;
  }; 

  this._getParent = function() {
    var subs = subscripts.slice(0);
    if (subs.length > 0) {
      subs.pop();
      return new GlobalNode(globalName, subs);
    }
    else {
      return;
    }
  };

  Object.defineProperty(this, '_parent', {
    enumerable: false,
    configurable: false,
    get: function() {
      return this._getParent();
    }
  });

  this._getNextProperty = function(seed) {
    var subs = subscripts.slice(0);
    subs.push(seed);
    var node = {global: globalName, subscripts: subs};
    return ewd.mumps.order(node).result;
  };

  this._getPreviousProperty = function(seed) {
    var subs = subscripts.slice(0);
    subs.push(seed);
    var node = {global: globalName, subscripts: subs};
    return ewd.mumps.previous(node).result;
  };
  
  this._next = this._getNextProperty;
  this._previous = this._getPreviousProperty;
  
  Object.defineProperty(this, '_firstProperty', {
    enumerable: false,
    configurable: false,
    get: function() {
      return this._getNextProperty('');
    }
  });
  
  Object.defineProperty(this, '_lastProperty', {
    enumerable: false,
    configurable: false,
    get: function() {
      return this._getPreviousProperty('');
    }
  });

  Object.defineProperty(this, '_first', {
    enumerable: false,
    configurable: false,
    get: function() {
      return this._getNextProperty('');
    }
  });

  Object.defineProperty(this, '_last', {
    enumerable: false,
    configurable: false,
    get: function() {
      return this._getPreviousProperty('');
    }
  });
  
  this._increment = function() {
     return ewd.mumps.increment(this._node).data;
  };

  this._delete = function() {
     ewd.mumps.kill(this._node);
  };
  
  this._getDocument = function() {

    var arrayOfSubscripts = function(globalNode) {
      var expected = 0;
      var isArray = true;
      var subs = globalNode._subscripts.slice(0);
      subs.push("");
      var node = {global: globalName, subscripts: subs};
      var result;  
      do {
        node = ewd.mumps.order(node);
        result = node.result;
        if (result !== '') {
          if (result !== expected) {
            isArray = false;
            break;
          } 
          else {
            expected++;
          }
        }
      }
      while (result !== '');
      return isArray;
    };

    var getSubnodes = function(globalNode) {
      var document = {};
      if (arrayOfSubscripts(globalNode)) document = [];
      globalNode._forEach(function(key,gnode) {
        if (gnode._hasValue) document[key] = gnode._value;
        if (gnode._hasProperties) {
          var subDocument = getSubnodes(gnode);
          document[key] = subDocument;
        }
      });
      return document;
    };

    return getSubnodes(this);
  };

  this._setDocument = function(document) {

    var setProperties = function(obj, globalNode) {
      var i;
      var j;
      for (i in obj){
        if (obj[i] === null) obj[i] = '';
        if (obj[i] instanceof Array) {
         if (obj[i].length !== 0) {
          for (j = 0; j < obj[i].length; j++) {
            if (typeof obj[i][j] === 'object') {
              var prop = i;
              setProperties(obj[i][j], globalNode.$(prop).$(j));
            } 
            else {
              var value = obj[i][j];
              if (value === null) value = '';
              globalNode.$(i).$(j)._value = value;
            }
          }
         }
        }
        if (typeof obj[i] !== 'object') {
          var value = obj[i];
          if (value === null) value = '';
          var prop = i;
          globalNode.$(prop)._value = value;
        }   
        if (obj[i] instanceof Object && !(obj[i] instanceof Array)) {
          setProperties(obj[i], globalNode.$(i));
        }
      }
    };

    setProperties(document, this);

  };
  
};

module.exports = {
  init: init,
  Global: Global,
  GlobalNode: GlobalNode,
  deleteGlobal: deleteGlobal,
  deleteGlobalNode: deleteGlobalNode,
  function: fn,
  MumpsFn: MumpsFn
};

