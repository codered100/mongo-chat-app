
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');

var mongo = require('mongodb').MongoClient;

var app = express();

var url = "73.170.132.180:27017,73.170.132.180:27018,73.170.132.180:27019/sharddb";

var MongoOplog = require('mongo-oplog');
//const oplog = MongoOplog('mongodb://jon:test123@ds155315.mlab.com:55315/mlabdb')
const oplog = MongoOplog('mongodb://73.170.132.180:27017/local')

//Azure IoT Hub inits
var connectionString = 'HostName=big-iot-hub.azure-devices.net;DeviceId=webapp;SharedAccessKey=rZdb/qCZ0SP+1uhMTbYluWIqaqsECp6D2u26TQYY/nc=';
var clientFromConnectionString = require('azure-iot-device-amqp').clientFromConnectionString;
var client = clientFromConnectionString(connectionString);

var Message = require('azure-iot-device').Message;


// all environments
app.set('port', process.env.PORT || 3000);
app.set('db', process.env.DB );
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
  }


var connectCallback = function (err) {
  if (err) {
    console.error('Could not connect: ' + err);
  } else {
    console.log('Client connected');
    var msg = new Message('some data from my device');
    client.sendEvent(msg, function (err) {
      if (err) {
        console.log(err.toString());
      } else {
        console.log('Message sent');
      };
    });
  };
};


app.get('/', routes.index);
app.get('/users', user.list);

var serve = http.createServer(app);
var io = require('socket.io')(serve);

serve.listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});

oplog.tail().then(() => {
    console.log('tailing started')
  }).catch(err => console.error(err));

  oplog.on('insert', doc => {
    console.log(doc);
    var mesg = new Message('FROM THE OPLOG');
    
    client.sendEvent(mesg, function (err) {
        if (err) {
          console.log(err.toString());
        } else {
          console.log('MESSAGE SENT WITHIN OPLOG INSERT');
        };
    });
});    

oplog.on('end', () => {
    console.log('Stream ended');
  });
  
oplog.on('delete', doc => {
    console.log("DELETED DOC");
    //console.log("doc.o._id");
  });

oplog.on('update', doc => {
    console.log("oplog update");
    
     console.log(doc);
   });

io.on('connection', function (socket) {
    client.open(connectCallback);
    
    console.log('a user connected');
/*
    mongo.connect(app.get('db'), function (err, db) {
        if(err){
            console.warn(err.message);
        } else {
            var collection = db.collection('chatMessages')
            var stream = collection.find().sort().limit(100).stream();
            stream.on('data', function (chat) { console.log('emitting chat'); socket.emit('chat', chat.content); });
        }
    });*/

    socket.on('disconnect', function () {
        console.log('user disconnected');
    });

    socket.on('chat', function (msg) {
        var mesg = new Message(msg);
        
        client.sendEvent(mesg, function (err) {
            if (err) {
              console.log(err.toString());
            } else {
              console.log('MESSAGE SENT TO AZURE FROM CHAT');
            };
        });

        mongo.connect(app.get('db'), function (err, db) {
            if(err){
                console.warn(err.message);
            } else {
                var collection = db.collection('chatMessages');
                collection.insert({ content: msg }, function (err, o) {
                    if (err) { console.warn(err.message); }
                    else { console.log("chat message inserted into db: " + msg); }
                    db.close();                
                });
            }
        });
/*
oplog.on('insert', doc => {
    console.log("AN INSERT DOC");
    mongo.connect(app.get('db'), function (err, db) {
        if(err){
            console.warn(err.message);
        } else {
            var collection = db.collection('chatMessages');
            collection.insert({ content: "OPLOGASD" }, function (err, o) {
                if (err) { console.warn(err.message); }
                else { console.log("chat message inserted into db: " + msg); }
              //  db.close();                
                
            });
        }
    });
  });
*/
        socket.broadcast.emit('chat', msg);
    });

});
