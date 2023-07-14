const dotenv = require('dotenv')
const express = require('express')
const jwt = require('jsonwebtoken');
const cors = require('cors');
const app = express()

dotenv.config()

// Import environment variables
const port = process.env.PORT || 3000
const apiKEY = process.env.API_KEY_VALUE
const apiURL = process.env.API_BASE_URL
const devENV = process.env.NODE_ENV == 'development'

// Config Cross Origin Resource Sharing
app.use(cors({
    origin: process.env.APP_URL
}))

app.post('/login', function(req, res) {
    // Verifiy that request has all paremeters
    if (!req.query.user || !req.query.password) {returnError(res, 400, 'Bad Request'); return}

    const auth = req.query

    // Compare credentials with dummy login
    if (auth.user == process.env.AUTH_USER && auth.password == process.env.AUTH_PASSWORD) {
        res.json({
            token: generateAccessToken()
        })
    } else {
        returnError(res, 401, 'Invalid Credentials')
    }
})

app.get('/currencies', function(req, res, next) { // get currency
    // Check token's validation
    if (!checkAccessToken(req) && !devENV) {returnError(res, 403, 'Unauthorized'); return}

    // Delete token for local validation
    delete req.query.token

    // Create string with parameters and add API Token
    const params = new URLSearchParams(req.query)
    params.append('app_id', apiKEY)

    fetch(`${apiURL}/currencies.json?${params}`)
    .then(resp => resp.json())
    .then(data => res.send(data))
    .catch(err => next(err))
})


// Send non existent GET request to 404
app.get('*', function(req, res){
    returnError(res, 404, 'Not Found')
})

// Send non existent POST request to 404
app.post('*', function(req, res){
    returnError(res, 404, 'Not Found')
})

app.listen(port, () => {
    console.log(`Open Exchange Middleware Running...`)
})

function generateAccessToken () {
    return jwt.sign({user: process.env.AUTH_USER}, process.env.JWT_TOKEN, {expiresIn: '20m'});
}

function checkAccessToken (req) {
    return jwt.verify(req.query.token, process.env.JWT_TOKEN, (error, token) => {return token} )
}

function returnError(res, status, message) {
    if (!res || !status || !message) {console.error('Missing function parameters'); return}
    res.status(status).json({message})
}

module.exports = app