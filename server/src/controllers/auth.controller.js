const jwt = require('jsonwebtoken')

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

    // DIAGNÓSTICO TEMPORAL
    console.log('[login] intento usuario:', usuario)
    console.log('[login] ADMIN_USER env:', process.env.ADMIN_USER || '(no definido)')
    console.log('[login] ADMIN_PASSWORD definida:', !!process.env.ADMIN_PASSWORD)

    const user = USUARIOS.find(
      u => u.usuario && u.password && u.usuario === usuario && u.password === password
    )

    if (!user) {
      console.log('[login] 401 — no se encontró usuario válido')
      return res.status(401).json({ mensaje: 'Credenciales incorrectas' })
    }

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
