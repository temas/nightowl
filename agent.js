var os = require("os");
var http = require("http");

var server = http.createServer(function(req, res) {
  var resJson = {
    load:os.loadavg(),
    mem:{
      total:os.totalmem(),
      free:os.freemem()
    }
  };

  res.writeHead(200, {"Content-Type": "application/json"});
  res.write(JSON.stringify(resJson));
  res.end();
});

server.listen(8489);
