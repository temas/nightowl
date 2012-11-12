var async = require("async");

exports.activeReporters = {
};

exports.register = function(level, newReporters) {
  if (!exports.activeReporters[level]) exports.activeReporters[level] = [];
  exports.activeReporters[level] = exports.activeReporters[level].concat(newReporters);
}

exports.reportForTriggered = function(triggered, cbDone) {
  console.log("Reporting for %j", triggered);
  var triggeredByLevel = {};
  triggered.forEach(function(trigger) {
    triggeredByLevel[trigger.level] = trigger;
  });
  Object.keys(triggeredByLevel).forEach(function(triggerLevel) {
    async.forEach(exports.activeReporters[triggerLevel], function(reporter, cbReporterStep) {
      reporter.reportForLevel(triggerLevel, triggeredByLevel[triggerLevel], cbReporterStep);
    }, function(err) {
      console.log("All reporters done for %s", triggerLevel);
    });
  });
}

function EmailReporter(emailAddress) {
  this.emailAddress = emailAddress;
}
EmailReporter.prototype.reportForLevel = function(level, triggers, cbDone) {
  console.log("Should email %s for level %s, triggers: %j", this.emailAddress, level, triggers);
}

function Email(emailAddress) {
  return new EmailReporter(emailAddress);
}

exports.mixin = function(ctx) {
  ctx.Email = Email;
}
