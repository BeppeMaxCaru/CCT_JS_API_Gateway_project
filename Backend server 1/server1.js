const express = require('express');
const fs = require('fs')
const https = require('https')

const app = express();
//Start the server
const port = 3001;

//Enable CORS to allow requests from different origins (including the load balancer)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

//Define your routes and logic here
app.get('/', (req, res) => {
  res.send('Hello from Backend Server 3001!');
});

//Define the heartbeat route
app.get('/heartbeat', (req, res) => {
  res.send('Backend Server is healthy!');
});

//Function to start the server with HTTPS
function startServer(port, options) {
  https.createServer(options, app).listen(port, () => {
    console.log(`Backend Server is running on port ${port} with HTTPS`);
  });
}

//Load the SSL/TLS certificates
const options = {
  key: fs.readFileSync('SecurityServer1/private_key_server1.pem'),
  cert: fs.readFileSync('SecurityServer1/certificate_server1.pem'),
  rejectUnauthorized: false, // Add this option to bypass certificate validation
  //This option is required since I'm self signing certificates but browsers by default reject
  //self-signed certificates for security reasons
  //By default they accept only the ones signed by official Certification Authority (CA)
};

//Start the server
startServer(port, options);