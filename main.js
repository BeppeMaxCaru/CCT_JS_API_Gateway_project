const express = require('express')
const { get } = require('http')
const app = express()
const port = 3000

//routes
app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log('Example app listening on port ${port}')
})