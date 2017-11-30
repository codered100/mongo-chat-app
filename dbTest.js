var MongoClient = require('mongodb').MongoClient
    , format = require('util').format;

//MongoClient.connect('mongodb://73.170.132.180/test', function(err, db) {
//MongoClient.connect('mongodb://jon:test123@ds155315.mlab.com:55315/mlabdb', function(err, db) {
    MongoClient.connect('mongodb://73.170.132.180:27018/sharddb', function(err, db) {
    if(err) throw err;

    var collection = db.collection('test_insert');
    collection.insert({a:2}, function(err, docs) {
        collection.count(function(err, count) {
            console.log(format("count = %s", count));
        });
    });

    // Locate all the entries using find
    collection.find().toArray(function(err, results) {
        console.dir(results);
        // Let's close the db
        db.close();
    });
});