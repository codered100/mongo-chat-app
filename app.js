
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
 //THIS WAS IN AZURE SETTINGS:DB    mongodb://73.170.132.180:27017,73.170.132.180:27018,73.170.132.180:27019/sharddb 
//var url = "73.170.132.180:27017,73.170.132.180:27018,73.170.132.180:27019/sharddb";

var MongoOplog = require('mongo-oplog');
//const oplog = MongoOplog('mongodb://jon:test123@ds155315.mlab.com:55315/mlabdb')
//const oplog = MongoOplog('mongodb://73.170.132.180:27017/local')
const oplog = MongoOplog('mongodb://oplog-reader:tenacore1525@ds135125-a0.mlab.com:35125,ds135125-a1.mlab.com:35125/local?replicaSet=rs-ds135125&authSource=admin')
//const oplog = MongoOplog('mongodb://koliada:tenacore1525@ds135125-a0.mlab.com:35125,ds135125-a1.mlab.com:35125/local?replicaSet=rs-ds135125authSource=')
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
  //  console.log(doc.o.temperature);
    //var data = JSON.stringify({ temperature: doc.o.temperature, humidity: doc.o.humidity, pressure: doc.o.pressure, id: doc.o.id, station: doc.o.station});
    var temp = doc.o._acl;
    console.log(temp);

    var role = temp.substring(0, temp.indexOf(":"));
    console.log("what is the role?");
    console.log(role);
    
    var mesg = new Message(JSON.stringify({ uuidRaw: doc.o.uuidRaw, _id: doc.o._id, _p_uuid: doc.o._p_uuid, _p_tag: doc.o._p_tag, _p_pd_coord: doc.o._p_pd_coord, major: doc.o.major, minor: doc.o.minor, txPwr: doc.o.txPwr, rssi: doc.o.rssi, role: doc.o.role, _created_at: doc.o._created_at, _updated_at: doc.o._updated_at}));
    console.log("1");
    console.log(mesg);
    
    console.log(doc.o);
    console.log("2");
    console.log(doc.o.o);
    console.log("3");
    console.log(doc.o._acl);


    

  console.log("oplog insert statement");
   // console.log(doc);
    
    
    client.sendEvent(mesg, function (err) {
        if (err) {
          console.log(err.toString());
        } else {
          console.log('MESSAGE SENT WITHIN OPLOG INSERT');
        };
    });
    
}); 
/*
oplog.on('op', data => {
    console.log(data);
  });
   */
  oplog.on('delete', doc => {
    console.log("oplog delete statement");
    
    console.log(doc.o._id);
  });
   
  oplog.on('error', error => {
    console.log("oplog error statement");
    
    console.log(error);
  });
   
  oplog.on('end', () => {
    console.log('Stream ended');
  });

/*
oplog.on('end', () => {
    console.log('Stream ended');
  });
  
oplog.on('delete', doc => {
    console.log("DELETED DOC");
    //console.log("doc.o._id");
  });
*/
/*
oplog.on('update', doc => {
    console.log("oplog update");
    
     console.log(doc);
   });
*/
   
   client.open(connectCallback);
   
io.on('connection', function (socket) {

    console.log('a user connected');
/*
    mongo.connect(app.get('db'), function (err, db) {
        if(err){
            console.warn(err.message);
        } else {
            var collection = db.collection('UserPlottedTag')
            var stream = collection.find().sort().limit(100).stream();
            stream.on('data', function (chat) { console.log('emitting chat'); socket.emit('chat', chat.desc); });
        }
    });
*/
    socket.on('disconnect', function () {
        console.log('user disconnected');
    });
/*
    socket.on('chat', function (msg) {
        var mesg = new Message(msg);
        
        client.sendEvent(mesg, function (err) {
            if (err) {
              console.log(err.toString());
            } else {
              console.log('MESSAGE SENT TO AZURE FROM CHAT');
            };
        });

        /*
        mongo.connect(app.get('db'), function (err, db) {
            if(err){
                console.warn(err.message);
            } else {
                var collection = db.collection('UserPlottedTag');
                collection.insert({ desc: msg }, function (err, o) {
                    if (err) { console.warn(err.message); }
                    else { console.log("chat message inserted into db: " + msg); }
                    db.close();                
                });
            }
        });
        */
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

/*
        socket.broadcast.emit('chat', msg);
    });
*/
});
