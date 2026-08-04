// Limitador de intentos de login en memoria.
// Suficiente para este despliegue: un solo proceso Node en Hostinger y dos
// usuarios. Si algún día se corre en varias instancias, hay que moverlo a la BD
// o a un almacén compartido, porque cada proceso llevaría su propio conteo.

const VENTANA_MS       = 15 * 60 * 1000 // 15 minutos
const MAX_INTENTOS     = 8
const LIMPIEZA_CADA_MS = 30 * 60 * 1000

const intentos = new Map()

// Se limpia sola para que el Map no crezca sin límite con IPs que ya no vuelven.
const limpieza = setInterval(() => {
  const ahora = Date.now()
  for (const [clave, registro] of intentos) {
    if (ahora - registro.primerIntento > VENTANA_MS) intentos.delete(clave)
  }
}, LIMPIEZA_CADA_MS)
limpieza.unref?.()

const construirClave = (req) => {
  const usuario = String(req.body?.usuario || '').trim().toLowerCase()
  return `${req.ip}|${usuario}`
}

const limitarLogin = (req, res, next) => {
  const clave = construirClave(req)
  const registro = intentos.get(clave)
  const ahora = Date.now()

  if (registro && ahora - registro.primerIntento > VENTANA_MS) {
    intentos.delete(clave)
    return next()
  }

  if (registro && registro.fallos >= MAX_INTENTOS) {
    const esperaSeg = Math.ceil((registro.primerIntento + VENTANA_MS - ahora) / 1000)
    res.set('Retry-After', String(esperaSeg))
    return res.status(429).json({
      mensaje: `Demasiados intentos fallidos. Intenta de nuevo en ${Math.ceil(esperaSeg / 60)} minuto(s).`,
    })
  }

  next()
}

const registrarFallo = (req) => {
  const clave = construirClave(req)
  const registro = intentos.get(clave)

  if (!registro) {
    intentos.set(clave, { fallos: 1, primerIntento: Date.now() })
  } else {
    registro.fallos += 1
  }
}

const limpiarIntentos = (req) => {
  intentos.delete(construirClave(req))
}

module.exports = { limitarLogin, registrarFallo, limpiarIntentos }
