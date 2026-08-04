const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const { registrarFallo, limpiarIntentos } = require('../middleware/rateLimit.middleware')

// Comparación de tiempo constante: se hashean ambos valores para igualar el
// largo antes de timingSafeEqual, que exige buffers del mismo tamaño.
const sonIguales = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const hashA = crypto.createHash('sha256').update(a).digest()
  const hashB = crypto.createHash('sha256').update(b).digest()
  return crypto.timingSafeEqual(hashA, hashB)
}

const login = async (req, res, next) => {
  try {
    const { usuario, password } = req.body

    if (!usuario || !password) {
      return res.status(400).json({ mensaje: 'Usuario y contraseña son requeridos' })
    }

    const USUARIOS = [
      { usuario: process.env.ADMIN_USER, password: process.env.ADMIN_PASSWORD, rol: 'admin' },
      { usuario: process.env.COLAB_USER, password: process.env.COLAB_PASSWORD, rol: 'colaborador' },
    ]

    const user = USUARIOS.find(
      u => u.usuario && u.password && sonIguales(u.usuario, usuario) && sonIguales(u.password, password)
    )

    if (!user) {
      registrarFallo(req)
      return res.status(401).json({ mensaje: 'Credenciales incorrectas' })
    }

    limpiarIntentos(req)

    const token = jwt.sign(
      { usuario: user.usuario, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    res.json({ token, usuario: user.usuario, rol: user.rol })
  } catch (error) {
    next(error)
  }
}

module.exports = { login }
