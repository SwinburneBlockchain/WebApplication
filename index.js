var express = require('express')
var app = express()
var cors = require('cors')
var bodyParser = require('body-parser');
var MongoClient = require('mongodb').MongoClient
var request = require("request");
var randomstring = require("randomstring");
var qr = require('qr-image');

// Connection URL
var url = 'mongodb://localhost:27017';
var nxtUrl = 'http://ec2-52-64-224-239.ap-southeast-2.compute.amazonaws.com:6876/nxt?';
var mainSecretPhrase = "curve excuse kid content gun horse leap poison girlfriend gaze poison comfort";

var db;
MongoClient.connect(url, function (err, database) {
   if (err)
   	throw err
   else
   {
	db = database;
	console.log('Connected to MongoDB');
	//Start app only after connection is ready

  db.createCollection("qrcodes", function(error, otherThing) {
    if (error) throw error;
      console.log("Collection created!");
  });

  db.createCollection("6f1d7a6cf2675206c7f756649721fa9db15c26ff8ea53173704a8c6949910458", function(error, otherThing) {
    if (error) throw error;
      console.log("Collection created!");
  });

   var port = process.env.PORT || 3000;
    app.listen(port, function (){
        console.log('Listening on port 3000...')
    });
   }
 });

//middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended:true}));

//GETTING QR CODE DETAILS
function getQRDetailsFromNxt(cb) {
  var randSecretKey = randomstring.generate(16);

  console.log("Received QR Code request");
  //API Says POST Only??
  const options = {
    method: 'GET',
    uri: nxtUrl,
    json: true,
    qs: {
      requestType: "getAccountId",
      secretPhrase: randSecretKey
    }
  };
  function callback(error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log("Created Nxt Account: " + body.accountRS);
      cb(body.accountRS, body.publicKey, randSecretKey);
    }
  }
  request(options, callback);
}

function sendToBlockchain(nxtAddr, nxtMsg) {
  request.post({url:nxtUrl, form: {requestType: 'sendMessage', secretPhrase: nxtPriv, recipient: nxtAddr, message: nxtMsg, deadline: '60', feeNQT: '0'}},
    function (error, response, body) {
      if (!error && response.statusCode == 200) {
        console.log("Message sent successfully")
        return true;
      } else {
        console.log("Error sending tx...");
        console.log(error);
        return false;
      }
    }
  );
}

function sendToBlockchain(nxtAddr, nxtMsg, nxtPriv, nxtPub) {
  console.log("ADVANCED SENDING");
  request.post({url:nxtUrl, form: {requestType: 'sendMessage', secretPhrase: nxtPriv, recipient: nxtAddr, recipientPublicKey: nxtPub, message: nxtMsg, deadline: '60', feeNQT: '0'}},
    function (error, response, body) {
      if (!error && response.statusCode == 200) {
        console.log("Message sent successfully")
        return true;
      } else {
        console.log("Error sending tx...");
        console.log(error);
        return false;
      }
    }
  );
}

app.post('/moveqr', function (req, res) {
  //var producerAddr = req.body.accAddr;
  var producerPrivKey = req.body.privKey;
  var productAddr = req.body.prodAddr;
  var productPubKey = req.body.prodPubKey;
  var prodDestination = req.body.destination;

  //prodDestination is set as 'message' in this transaction.
  sendToBlockchain(productAddr, prodDestination, producerPrivKey, productPubKey)
  res.send("QR code updated successfully.");
});

//THING
app.post('/getqr', function (req, res) {
  console.log("Requesting QR Code");

  var producerAddr = req.body.accAddr;
  var producerPubKey = req.body.pubKey;
  var productName = req.body.productName;
  var productId = req.body.productID;
  var batchId = req.body.batchID;

  db.listCollections().toArray(function(err, collInfos) {
    collInfos.forEach(function(value) {
      if(String(value.name) == (producerPubKey)) {
        getQRDetailsFromNxt(function(accAddr, pubKey, privKey) {
          sendToBlockchain(accAddr, "valid");

          qrString = "{\"accAddr\":" + "\"" + accAddr + "\"" + ",\"pubKey\":" + "\"" + pubKey + "\"" + ",\"privKey\":" + "\"" + privKey + "\"" + "}";
          var qrSvgString = qr.imageSync(qrString, {type: 'svg'});

          insert = {
            'acc': accAddr,
            'pubKey': pubKey,
            'privKey': privKey
            // Do we want to include SVG string in db?
            //'QRSvg': qrSvgString
          }
          db.collection(producerPubKey).insert(insert, function(err, doc) {
            if (err) throw err;
            console.log("QR Code inserted");

          });
          res.send(qrSvgString);
        });
        console.log("Existing Table");
      } else {
        //Something here
      }
    });
  });
});

app.post('/getqrtest', function (req, res) {
  console.log("Requesting QR Code Test");

  var producerAddr = req.body.accAddr;
  var producerPubKey = req.body.pubKey;
  var productName = req.body.productName;
  var productId = req.body.productID;
  var batchId = req.body.batchID;

  db.listCollections().toArray(function(err, collInfos) {
    collInfos.forEach(function(value) {
      if(String(value.name) == (producerPubKey)) {
        console.log("Found table name with same public key");
        getQRDetailsFromNxt(function(accAddr, pubKey, privKey) {
          qrString = "{\"accAddr\":" + "\"" + accAddr + "\"" + ",\"pubKey\":" + "\"" + pubKey + "\"" + ",\"privKey\":" + "\"" + privKey + "\"" + "}";
          var qrSvgString = qr.imageSync(qrString, {type: 'svg'});

          insert = {
            'acc': accAddr,
            'pubKey': pubKey,
            'privKey': privKey
          }
          db.collection(producerPubKey).insert(insert, function(err, doc) {
            if (err) throw err;
            console.log("QR Code inserted");

          });
          res.send(qrSvgString);
        });
        console.log("Existing Table");
      } else {
        //Something here
      }
    });
  });
});

//Remove the QRCodes Collection. Only temporary
app.get('/removeqr', (req, res) => {
  res.send(db.collection("6f1d7a6cf2675206c7f756649721fa9db15c26ff8ea53173704a8c6949910458").drop())
})

app.get('/getqr', (req, res) => {
	console.log('Getting Query!');

  db.collection("6f1d7a6cf2675206c7f756649721fa9db15c26ff8ea53173704a8c6949910458").find({}).toArray(function(err, result) {
     if (err) throw err;
	   res.send(result)
     console.log(result);
  });
})

app.get('/gettables', (req, res) => {
db.listCollections().toArray(function(err, collInfos) {
  collInfos.forEach(function(value) {
    console.log(value);
  });
});
})

app.post('/test', function (req, res) {
  console.log("Requesting QR Code");
  console.log(req.body);
})
