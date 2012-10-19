var io = require('socket.io');
var http = require('http');
var url = require('url');
var fs = require('fs');

var PubSub = require('planchat.pubsub');
var Chat = require('../src/chat');

var config = require('../etc/server.conf');

var documentRoot = fs.realpathSync(process.argv[2]) || (process.cwd() + '/public');

var app = http.createServer(function(request, response) {
    console.log('Request recieved: ' + request.method + ' ' + request.url);

    var parsedUrl = url.parse(request.url, true, true);
    console.log(parsedUrl);

    fs.readFile(documentRoot + parsedUrl.pathname, function(error, data) {
        if (error) {
            console.log('Could not find file : ' + documentRoot + parsedUrl.pathname);
            console.error(error);
            response.writeHead(500);
            return response.end('Error loading URL ' + request.url);
        }

        response.writeHead(200);
        response.end(data);
    });
});

var socket = io.listen(app);

for (var i = 0; i < config.length; i++) {
    var pubsub = new PubSub('redis');
    pubsub.backend.setPub(config[i].redis.pub.host, config[i].redis.pub.port);
    pubsub.backend.setSub(config[i].redis.sub.host, config[i].redis.sub.port);
    pubsub.backend.register(pubsub);

    var chat = new Chat(pubsub, socket, app);
    chat.setup(config[i].channel, config[i].path);
}

app.listen(8000, function(socket){
    var inet = this.address();
    console.log('Server started on ' + inet.address + ':' + inet.port);
});
