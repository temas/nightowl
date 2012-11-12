var clc = require("cli-color");
var request = require("request");
var async = require("async");
var hostcache = require("./hostcache");
var reporters = require("./reporters");

reporters.mixin(global);

var debug = clc.yellow;

Array.prototype.unique = function() {
  var a = this.concat();
  for(var i=0; i<a.length; ++i) {
    for(var j=i+1; j<a.length; ++j) {
      if(a[i] === a[j])
        a.splice(j, 1);
    }
  }

  return a;
};

Comparators = {
  gt : function(lh, rh) { return lh > rh; },
  gte : function(lh, rh) { return lh >= rh; },
  lt : function(lh, rh) { return lh < rh; },
  lte : function(lh, rh) { return lh <= rh; },
  eq : function(lh, rh) { return lh == rh; },
  neq : function(lh, rh) { return lh != rh; }
};

function guaranteeTick(func) {
  return function() {
    var args = arguments;
    process.nextTick(function() {
      func.apply(null, args);
    });
  }
}


function OnWarn(newReporters) {
  reporters.register("warn", newReporters);
}

function Monitor(name, valueRetriever) {
  this.name = name;
  this.valueRetriever = valueRetriever;
}
Monitor.prototype.check = function(hosts, cbDone) {
  console.log(debug(">> Checking triggers: ") + "%j", this.triggers);
  var self = this;
  var triggered = []
  async.forEach(hosts, guaranteeTick(function(host, cbHostStep) {
    self.valueRetriever(host, function(error, curValue) {
      triggered = triggered.concat(self.compareTriggers(curValue))
      console.log(debug(">> Triggered: ") + "%j", triggered);
      cbHostStep();
    });
  }), function(err) {
    cbDone(err, triggered);
  });
}
Monitor.prototype.gatherTriggers = function(args) {
  this.triggers = [];
  for (var i = 0; i < args.length; ++i) {
    // If this is a trigger gather it
    if (Trigger.prototype.isPrototypeOf(args[i])) {
      this.triggers.push(args[i]);
    }
  }
}
Monitor.prototype.compareTriggers = function(curValue) {
  var triggered = [];
  this.triggers.forEach(function(trigger) {
    console.log(debug(">> Trigger for %s value %d"), trigger.key, trigger.value);
    if (trigger.comparator(curValue, trigger.value)) {
      triggered.push({
        curValue:curValue,
        triggerValue:trigger.value,
        level:trigger.key
      });
    }
  });
  return triggered;
}

function Trigger(key, value, comparator) {
  this.key = key;
  if (typeof(value) == "function") {
    return false;
  }

  //monitor.checkTrigger(this);

}

function Warn(value) {
  this.value = value;
}
Warn.prototype = new Trigger("warn");

function DiskSpace() {
  var monitor = new Monitor("DiskSpace", function(value) {
    // Check the trigger`
    console.log(debug(">> Should check if disk space is ok"));
  });
  monitor.gatherTriggers(arguments);
  console.log(debug(">> Triggers: ") + "%j", monitor.triggers);
  return monitor;
}

function Load() {
  var monitor = new Monitor("Load", function(host, cbDone) {
    var curLoad = hostcache.hostInfo[host].load[0];
    cbDone(null, curLoad);
  });
  monitor.gatherTriggers(arguments);
  // Apply the default comparator
  monitor.triggers.forEach(function(trigger) {
    if (!trigger.comparator) trigger.comparator = Comparators.gt;
  });
  return monitor;
}

function System(monitors) {
  // Group the monitors by type
  var monitorTypes = {};
  monitors.forEach(function(monitor) {
    var type = monitor.name
    if (!monitorTypes[type]) monitorTypes[type] = [];
    monitorTypes[type].push(monitor);
  });
  // Now order them so those that have host groups run first for an instance type
  Object.keys(monitorTypes).forEach(function(type) {
    monitorTypes[type].sort(function(lh, rh) {
      return (lh.hosts || 0) < (rh.hosts || 0);
    });
  });

  console.log(debug(">> Sorted monitoring: ") + "%j", monitorTypes);

  // TODO:  This should be a timer method
  hostcache.updateAll(HostGroups, function(err) {
    console.log(debug(">> Host update complete"));

    // For each type we run tracking hosts that have run.  Any monitor
    // with an explicit host list will always run it, but the last one
    // with no specified list will only run the hosts that are left over
    async.forEach(Object.keys(monitorTypes), guaranteeTick(function(type, cbTypeStep) {
      console.log(debug(">> Running type " + type));
      var ranHosts = [];
      // Find the hosts we'll run so the default gets all the rest
      monitorTypes[type].forEach(function(monitor) {
        if (monitor.hosts) ranHosts = ranHosts.concat(monitor.hosts);
      });
      var remainingHosts = hostcache.allHosts.filter(function(host) { return ranHosts.indexOf(host) < 0; });
      // Ok actually run them
      var allTriggered = [];
      async.forEach(monitorTypes[type], guaranteeTick(function(monitor, cbMonitorStep) {
        monitor.check((monitor.hosts || remainingHosts), function(err, triggered) {
          allTriggered = allTriggered.concat(triggered);
          cbMonitorStep(err);
        });
      }), function(err) {
        reporters.reportForTriggered(allTriggered);
        console.log("Done for type %s", type);
        cbTypeStep();
      });
    }), function(err) {
      console.log("Done for all types");
    });
    /*
    monitors.forEach(function(monitor) {
      monitor.check()
    });
    */
  });
}
/*
HostGroups = {
  workers:EC2SecurityGroup("workers"),
  apihost:EC2SecurityGroup("hallway"),
  dawg:EC2SecurityGroup("dawg")
};

// On a warning what should be done
OnWarning([
  Email("temas@singly.com"),
  HipChat("nerds@singly.com", "key?")
]);

// On an alert what should be done
OnAlert([
  Email("shortcode")
]);

Monitor([
  DiskSpace(Warn(40), Alert(15), ["/paths", "/to", "/watch"]), // Warn on disk space any mount under 40% capacity
  Load(Warn(1.0), Alert(1.2), HostGroup("workers")), // Specific HostGroup can be specified to any monitor
  Load(Warn(0.8), Alert(1.0)), // No HostGroup will watch all by default or all unmonitored if one is specified elsewhere
  Metric("api.hits", Warn(function(metrics) {
    return false;
  });
]);
*/

HostGroups = {
  debug:["127.0.0.1"]
};

System([
  Load(new Warn(0.2))
]);

OnWarn([
  Email("temas@singly.com")
]);

/*
var monitor = new Monitor();
monitor.warn = true;
monitor.check();
*/
