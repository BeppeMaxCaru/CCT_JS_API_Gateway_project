const express = require('express')
const { get } = require('http')
const path = require('path')
const axios = require('axios')
const httpProxy = require('http-proxy');
const crypto = require('crypto')
const fs = require('fs')
const https = require('https')
const rateLimit = require('express-rate-limit');
const session = require('express-session');

// Create the Express app
const app = express()
const port = 3000

// Create an array of backend servers
const backendServers = [
    { target: 'https://localhost:3001', healthy: true },
    { target: 'https://localhost:3002', healthy: true },
    // Add more backend servers as needed
];
  
// Create the proxy server
//Secure false required to have the proxy accepting self-signed certificates
const proxy = httpProxy.createProxyServer({ secure: false });

// Set up session middleware
app.use(session({
    secret: 'my-secret-key',
    resave: false,
    saveUninitialized: true,
}));

app.use(express.urlencoded({ extended: true }));

// Apply rate limiting middleware
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute (60 seconds * 1000 since time unit is millisec)
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Define the load balancing logic
let currentServerIndex = 0;

function getHealthyServers() {
  console.log(backendServers)
  return backendServers.filter(server => server.healthy);
}

function getNextTargetServer() {
  const healthyServers = getHealthyServers();
  return healthyServers[currentServerIndex];
}

function rotateBackendServer() {
  currentServerIndex = (currentServerIndex + 1) % getHealthyServers().length;
}

function handleProxyError(err, req, res) {
  if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
    // If the request times out or encounters a connection reset error,
    // switch to the next backend server and retry the request
    rotateBackendServer();
    const newTargetServer = getNextTargetServer();
    proxy.web(req, res, { target: newTargetServer.target, timeout: 5000 });
  } else {
    // If it's not a timeout or connection reset error, handle the error normally
    console.error('Load Balancer Error:', err);
    res.status(500).send('Load Balancer Error');
  }
}

// Function to send a heartbeat to a backend server and check its health
async function checkBackendServerHealth(backendServer) {
  try {
    const response = await axios.get(`${backendServer.target}/heartbeat`, {
      // Make axios also accept self-signed certificates otherwise not working
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    });

    if (response.status === 200 && response.data === 'Backend Server is healthy!') {
      return true; // Backend server is healthy
    }
  } catch (error) {
    console.error(`Error checking health of backend server ${backendServer.target}: ${error.message}`);
  }

  return false; // Backend server is not healthy
}

// Periodically update the backend servers array every 30 seconds
setInterval(async () => {
  const updatedBackendServers = [];
  for (const backendServer of backendServers) {
    const isHealthy = await checkBackendServerHealth(backendServer);
    backendServer.healthy = isHealthy;
    if (isHealthy) {
      updatedBackendServers.push(backendServer);
    }
  }
}, 30000);

// Define the load balancing route for '/'
const loadBalancerRouter = express.Router();

loadBalancerRouter.get('/', (req, res) => {
  if (req.session.authenticated) {
    // User is authenticated, proceed to load balancing
    const targetServer = getNextTargetServer();

    // Proxy the request to the chosen backend server with a timeout of 5 seconds
    proxy.web(req, res, { target: targetServer.target, timeout: 5000 });

    // Handle proxy request timeout and switch to the next healthy backend server
    proxy.on('error', (err) => handleProxyError(err, req, res));

    // Rotate to the next backend server
    rotateBackendServer();
  } else {
    // User is not authenticated, redirect to login page
    res.redirect('/login');
  }
});

// Define login routes
const loginRouter = express.Router();

loginRouter.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Front-end/login page.html'));
});

loginRouter.post('/', (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  // Perform validation or authentication logic
  // ...

  if (username === 'admin' && password === 'password') {
    req.session.authenticated = true;
    res.redirect('/');
  } else {
    res.send('Invalid username or password');
  }
});

// Mount routers
app.use('/', loadBalancerRouter);
app.use('/login', loginRouter);

// Handle requests to other routes by load balancing to backend servers
// Handle requests to other routes by load balancing to backend servers
app.all('*', (req, res) => {
  if (req.session.authenticated) {
    const targetServer = getNextTargetServer();
    proxy.web(req, res, { target: targetServer.target, timeout: 5000 });
    proxy.on('error', (err) => handleProxyError(err, req, res));
    rotateBackendServer();
  } else {
    res.redirect('/login');
  }
});

// Handle errors in the load balancer
proxy.on('error', (err, req, res) => {
  console.error('Load Balancer Error:', err);
  res.status(500).send('Load Balancer Error');
});

// Creating object of key and certificate for SSL
const options = {
  key: fs.readFileSync('Security/private_key_API_gateway.pem'),
  cert: fs.readFileSync('Security/certificate_API_gateway.pem'),
  rejectUnauthorized: false, // Add this option to bypass certificate validation
  //This option is required since I'm self signing certificates but browsers by default reject
  //self-signed certificates for security reasons
  //By default they accept only the ones signed by official Certification Authority (CA)
};

// Start the server at https://localhost:3000
https.createServer(options, app).listen(port, () => {
  console.log(`Load Balancer is running on port ${port}`);
});