var clc = require("cli-color");
var async = require("async");
var request = require("request");

var debug = clc.yellow;

exports.hostInfo = {};
exports.allHosts = [];

exports.updateAll = function(hostGroups, cbDone) {
  exports.allHosts = [];
  Object.keys(hostGroups).forEach(function(hostgroup) {
    exports.allHosts = exports.allHosts.concat(hostGroups[hostgroup]);
  });
  exports.allHosts = exports.allHosts.unique();
  console.log(debug(">> All hosts: ") + "%j", exports.allHosts);

  async.forEach(exports.allHosts, function(host, cbStep) {
    request({url:("http://" + host + ":8489"), json:true}, function(err, res, body) {
      exports.hostInfo[host] = body;
      cbStep();
    });
  }, cbDone);
}
