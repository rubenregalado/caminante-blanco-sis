const prisma = require('../lib/prisma')
const { enviarCorreoListoParaRecoger } = require('../services/email.service')

const enviarCorreo = async (req, res, next) => {
  try {
    const ordenId = parseInt(req.params.ordenId)
    const orden = await prisma.orden.findUniqueOrThrow({
      where: { id: ordenId },
      include: { cliente: true }
    })

    if (!orden.cliente.correo) {
      return res.status(400).json({ mensaje: 'El cliente no tiene correo registrado' })
    }

    const info = await enviarCorreoListoParaRecoger(orden)

    const notificacion = await prisma.notificacion.create({
      data: {
        ordenId,
        tipo: 'correo',
        mensaje: `Correo enviado a ${orden.cliente.correo}`,
        enviadoAt: new Date(),
        estado: 'enviado'
      }
    })

    res.json({ mensaje: 'Correo enviado', messageId: info.id, notificacion })
  } catch (error) {
    next(error)
  }
}

const obtenerNotificaciones = async (req, res, next) => {
  try {
    const notificaciones = await prisma.notificacion.findMany({
      where: { ordenId: parseInt(req.params.ordenId) },
      orderBy: { enviadoAt: 'desc' }
    })
    res.json(notificaciones)
  } catch (error) {
    next(error)
  }
}

module.exports = { enviarCorreo, obtenerNotificaciones }
