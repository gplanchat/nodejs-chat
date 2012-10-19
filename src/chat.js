
var PubSub = require('planchat.pubsub');
var events = require('events');
var EventEmitter = events.EventEmitter;
var util = require('util');

var Redis = require('redis');
var Util = require('util');
var Crypto = require('crypto');

module.exports = Chat;

var hash = function(data) {
    var shasum = Crypto.createHash('sha256');
    shasum.update(data);

    return shasum.digest('hex');
};

function Chat(pubsub, io, path) {
    EventEmitter.call(this);

    this.pubsub = pubsub;

    this.io = io;
    this.serverHandles = [];
}

util.inherits(Chat, EventEmitter);

Chat.prototype.setup = function(channel, path) {
    this.pubsub.subscribe(channel);

    var handle = this.io.of(path || '/');

    handle.frontend = this;
    this.serverHandles.push(handle);

    var frontend = this;
    handle.on('connection', function(socket){
        frontend.pubsub.on('message', function(channel, raw){
            if (typeof raw !== 'string') {
                return;
            }

            var frame = JSON.parse(raw);
            if (typeof frame !== 'object' || typeof frame.nickname !== 'string' || typeof frame.text !== 'string') {
                return;
            }

            socket.emit('message', channel, frame.text, frame.nickname, frame.date);
        });
    });

    handle.on('connection', function(socket){
        var frontend = this.frontend
        socket.on('nickname', function(nickname) {
            console.log(new Error(), 'nickname: ' + nickname);
            this.set('nickname', nickname);

            var frame = {
                date: (new Date()).toDateString(),
                nickname: 'SYSTEM',
                text: ('Welcome to ' + nickname)
            };

            frontend.pubsub.publish(channel, JSON.stringify(frame));
        });

        socket.on('message', function(message) {
            this.get('nickname', function(error, nickname) {
                var frame = {
                    date: (new Date()).toDateString(),
                    nickname: nickname || 'anonymous',
                    text: message
                };
                console.log(new Error(), 'message: ' + frame);

                frontend.pubsub.publish(channel, JSON.stringify(frame));
            });
        });
    });
};
