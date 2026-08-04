const express = require('express')
const { login } = require('../controllers/auth.controller')
const { limitarLogin } = require('../middleware/rateLimit.middleware')

const router = express.Router()

router.post('/login', limitarLogin, login)

module.exports = router
