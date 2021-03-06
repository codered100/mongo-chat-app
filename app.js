﻿
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
var connectionString = 'HostName=armconhub2.azure-devices.net;DeviceId=WebAppdevice;SharedAccessKey=8fhVUNHZ7qup+Z4ur+XghvHsJhgmCgUUEta3BngRSUk=';
var clientFromConnectionString = require('azure-iot-device-amqp').clientFromConnectionString;
var client = clientFromConnectionString(connectionString);
var Message = require('azure-iot-device').Message;

var Connection = require('tedious').Connection;
var Request = require('tedious').Request;
// Create connection to database
var config = 
{
  userName: 'jonathan', // update me
  password: 'Let1KoliadaIn2$', // update me
  server: 'armcondb.database.windows.net', // update me
  options: 
     {
        database: 'ArmConDb' //update me
        , encrypt: true
     }
}
var connection = new Connection(config);

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




// Attempt to connect and execute queries if connection goes through
connection.on('connect', function(err) 
{
  if (err) 
    {
       console.log(err)
    }
 else
    {
             console.log('it works')

        //queryDatabase() //TEST QUERIES
    }
}
);
function queryDatabase()
{ console.log('Reading rows from the Table...');

    // Read all rows from table
  request = new Request(
       "SELECT top(100) _id,_p_tag, _created_at FROM beacondata order by _created_at desc",
          function(err, rowCount, rows) 
             {
                 console.log(rowCount + ' row(s) returned');
                 process.exit();
             }
         );

  request.on('row', function(columns) {
     columns.forEach(function(column) {
         console.log("%s\t%s", column.metadata.colName, column.value);
      });
          });
  connection.execSql(request);
}


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
    console.log("oplog insert statement");
    
    //var data = JSON.stringify({ temperature: doc.o.temperature, humidity: doc.o.humidity, pressure: doc.o.pressure, id: doc.o.id, station: doc.o.station});
   console.log(doc);
    var temp =  doc.o._wperm;
    
   // console.log(temp);

   // var role = temp.split("/'", 1)
   // console.log("what is the role?");
   // console.log(role);
   //console.log(temp);
   var temp = JSON.stringify(doc.o._wperm);
    if (temp.includes("SPECIALTYSC")){
        var mesg = new Message(JSON.stringify({ uuidRaw: doc.o.uuidRaw, _id: doc.o._id, _p_pd: doc.o._p_pd,_p_uuid: doc.o._p_uuid, _p_tag: doc.o._p_tag, _p_pd_coord: doc.o._p_pd_coord, major: doc.o.major, minor: doc.o.minor, txPwr: doc.o.txPwr, rssi: doc.o.rssi, _created_at: doc.o._created_at, _updated_at: doc.o._updated_at}));
    console.log("1");
    console.log(mesg);
    client.sendEvent(mesg, function (err) {
        if (err) {
          console.log(err.toString());
        } else {
          console.log('MESSAGE SENT WITHIN OPLOG INSERT');
        };
    });
 }
 /*
 console.log("printing full doc...");
    console.log(doc.o);
*/


    

   // console.log(doc);
    
    

    
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
