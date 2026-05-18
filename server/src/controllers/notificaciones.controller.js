const { db } = require('../lib/db')
const { ordenes, notificaciones } = require('../lib/schema')
const { eq, desc } = require('drizzle-orm')
const { findOrden } = require('../lib/helpers')
const { enviarCorreoListoParaRecoger } = require('../services/email.service')

const enviarCorreo = async (req, res, next) => {
  try {
    const ordenId = parseInt(req.params.ordenId)

    const orden = await findOrden(eq(ordenes.id, ordenId), { cliente: true })

    if (!orden) {
      const err = new Error('Registro no encontrado')
      err.code = 'NOT_FOUND'
      throw err
    }

    if (!orden.cliente.correo) {
      return res.status(400).json({ mensaje: 'El cliente no tiene correo registrado' })
    }

    const info = await enviarCorreoListoParaRecoger(orden)

    const [{ id: notifId }] = await db.insert(notificaciones).values({
      ordenId,
      tipo:     'correo',
      mensaje:  `Correo enviado a ${orden.cliente.correo}`,
      enviadoAt: new Date(),
      estado:   'enviado',
    }).$returningId()

    const notifRows = await db
      .select()
      .from(notificaciones)
      .where(eq(notificaciones.id, notifId))

    res.json({ mensaje: 'Correo enviado', messageId: info.id, notificacion: notifRows[0] })
  } catch (error) {
    next(error)
  }
}

const obtenerNotificaciones = async (req, res, next) => {
  try {
    const result = await db
      .select()
      .from(notificaciones)
      .where(eq(notificaciones.ordenId, parseInt(req.params.ordenId)))
      .orderBy(desc(notificaciones.enviadoAt))

    res.json(result)
  } catch (error) {
    next(error)
  }
}

module.exports = { enviarCorreo, obtenerNotificaciones }
