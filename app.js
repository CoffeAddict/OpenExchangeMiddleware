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
const devENV = process.env.NODE_ENV == 'dev'

// Config Cross Origin Resource Sharing
app.use(cors({
    origin: process.env.APP_URL
}))

/*
    Login
    Params:
        user <string> - required
        password <string> - required
        save <boolean> - optional // Save the login for 30d
*/
app.post('/login', function(req, res) {
    // Check request paremeters
    if (!req.query.user || !req.query.password) {returnError(res, 400, 'Bad Request'); return}

    // Compare credentials with dummy login
    const auth = req.query

    if (auth.user == process.env.AUTH_USER && auth.password == process.env.AUTH_PASSWORD) {
        const save = !!auth.save
        res.json({
            token: generateAccessToken(save)
        })
    } else {
        returnError(res, 401, 'Invalid Credentials')
    }
})

/*
    Currencies
    Params:
        none
*/
app.get('/currencies', function(req, res, next) { // get currency
    // Check token's validation
    if (!checkAccessToken(req) && !devENV) {returnError(res, 403, 'Unauthorized'); return}

    // Apply format to parameters
    delete req.query.token

    // Create string with parameters and add API Token
    const params = new URLSearchParams(req.query)
    params.append('app_id', apiKEY)

    fetch(`${apiURL}/currencies.json?${params}`)
    .then(resp => resp.json())
    .then(data => res.send(data))
    .catch(err => next(err))
})

/*
    Historic
    Params:
        base <string> - optional // Base currency, default is USD - only available for paid plans
        symbols <string[]> - optional // Limit return currencies list
        date <string (yyyy-mm-dd)> - optional // Get specific date exchage rates
        dates <string[] (yyyy-mm-dd)> - optional // Get exchange rates from multiple dates
*/
app.get('/historic', function(req, res, next) {
    // Check token's validation
    if (!checkAccessToken(req) && !devENV) {returnError(res, 403, 'Unauthorized'); return}

    // Check parameters
    if (!req.query.date && !req.query.dates) {returnError(res, 400, 'Bad Request'); return}

    // Apply format to parameters
    delete req.query.token

    // Create params and make request
    const qParams = req.query
    const params = new URLSearchParams()
    params.append('app_id', apiKEY)
    if (qParams.base) params.append('base', qParams.base)
    if (qParams.symbols) params.append('symbols', qParams.symbols)

    const dates = qParams.date ? [qParams.date] : qParams.dates

    let fetchBuffer = []

    for(let date of dates) {
        fetchBuffer.push(fetch(`${apiURL}/historical/${date}.json?${params}`).then(resp => resp.json()))
    }

    Promise.all(fetchBuffer).then(dataList => res.send(dataList))
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

function generateAccessToken (save) {
    let time = save ? '30d' : '1h'
    return jwt.sign({user: process.env.AUTH_USER}, process.env.JWT_TOKEN, {expiresIn: time});
}

function checkAccessToken (req) {
    return jwt.verify(req.query.token, process.env.JWT_TOKEN, (error, token) => {return token} )
}

function returnError(res, status, message) {
    if (!res || !status || !message) {console.error('Missing function parameters'); return}
    res.status(status).json({message})
}

module.exports = app