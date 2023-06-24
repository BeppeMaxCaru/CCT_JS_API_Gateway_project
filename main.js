const express = require('express')
const { get } = require('http')
const app = express()
const port = 3000

const path = require('path')

app.use(express.urlencoded({ extended: true }));

//routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Front-end/welcome page.html'))
})

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'Front-end/login page.html'))
})

app.post('/login', (req, res) => {

    //console.log(req.body)

    // Retrieve the username and password from the form data
    const username = req.body.username;
    const password = req.body.password;

    // Perform validation or authentication logic
    // ...

    // Example: Check if username and password are valid
    if (username === 'admin' && password === 'password') {
        // Successful login
        res.sendFile(path.join(__dirname, 'Front-end/home.html'))
    } else {
        // Invalid credentials
        res.send('Invalid username or password');
    }
})

app.get('/test', (req, res) => {
    //res.send('Test page!')
    res.sendFile(path.join(__dirname, 'Front-end/home.html'))
})

app.listen(port, () => {
    console.log('Example app listening on port ' + port)
})