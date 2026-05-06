const prisma = require('../lib/prisma')
const { generarNumeroOrden } = require('../utils/numeroOrden')
const { enviarCorreoOrdenRecibida, enviarCorreoListoParaRecoger } = require('../services/email.service')

const ESTADOS_VALIDOS = ['pendiente', 'en_proceso', 'listo', 'entregado']

const mapearItem = (item) => ({
  tipoItem:      item.tipoItem || 'tenis',
  servicio:      item.servicio      || null,
  color:         item.color         || null,
  extras:        item.extras        || null,
  precio:        parseFloat(item.precio || 0),
  // Campos tenis
  tipoZapato:    item.tipoItem === 'accesorio' ? null : (item.tipoZapato || null),
  talla:         item.tipoItem === 'accesorio' ? null : (item.talla     || null),
  marca:         item.tipoItem === 'accesorio' ? null : (item.marca     || null),
  // Campos accesorio
  tipoAccesorio: item.tipoItem === 'accesorio' ? (item.tipoAccesorio || null) : null,
  tamano:        item.tipoItem === 'accesorio' ? (item.tamano        || null) : null,
})

const previsualizarNumero = async (req, res, next) => {
  try {
    const numero = await generarNumeroOrden()
    res.json({ numeroOrden: numero })
  } catch (error) {
    next(error)
  }
}

const listarOrdenes = async (req, res, next) => {
  try {
    const { estado, buscar } = req.query
    const where = {}
    if (estado) where.estado = estado
    if (buscar) {
      where.OR = [
        { numeroOrden: { contains: buscar } },
        { cliente: { nombre: { contains: buscar } } }
      ]
    }
    const ordenes = await prisma.orden.findMany({
      where,
      include: { cliente: true, items: true },
      orderBy: { createdAt: 'desc' }
    })
    res.json(ordenes)
  } catch (error) {
    next(error)
  }
}

const obtenerOrden = async (req, res, next) => {
  try {
    const orden = await prisma.orden.findUniqueOrThrow({
      where: { id: parseInt(req.params.id) },
      include: { cliente: true, items: true, notificaciones: true }
    })
    res.json(orden)
  } catch (error) {
    next(error)
  }
}

const buscarPorNumero = async (req, res, next) => {
  try {
    const orden = await prisma.orden.findUniqueOrThrow({
      where: { numeroOrden: req.params.numero },
      include: { cliente: true, items: true }
    })
    res.json(orden)
  } catch (error) {
    next(error)
  }
}

const crearOrden = async (req, res, next) => {
  try {
    const { clienteId, fechaIngreso, fechaEntrega, formaPago, anticipo, notas, urlFotos, items } = req.body

    if (!clienteId || !fechaIngreso) {
      return res.status(400).json({ mensaje: 'clienteId y fechaIngreso son requeridos' })
    }
    if (items && items.length > 12) {
      return res.status(400).json({ mensaje: 'Máximo 12 artículos por orden' })
    }

    const itemsData = items || []
    const total = itemsData.reduce((sum, item) => sum + parseFloat(item.precio || 0), 0)
    const numeroOrden = await generarNumeroOrden()

    const orden = await prisma.orden.create({
      data: {
        numeroOrden,
        clienteId:    parseInt(clienteId),
        fechaIngreso: new Date(fechaIngreso),
        fechaEntrega: fechaEntrega ? new Date(fechaEntrega) : null,
        formaPago,
        anticipo:     parseFloat(anticipo || 0),
        total,
        notas,
        urlFotos:     urlFotos || null,
        estado: 'pendiente',
        items: { create: itemsData.map(mapearItem) }
      },
      include: { cliente: true, items: true }
    })

    if (orden.cliente.correo) {
      try {
        await enviarCorreoOrdenRecibida(orden)
        await prisma.notificacion.create({
          data: { ordenId: orden.id, tipo: 'correo', mensaje: `Confirmación de recepción enviada a ${orden.cliente.correo}`, enviadoAt: new Date(), estado: 'enviado' }
        })
      } catch (emailError) {
        console.error('Error al enviar correo de recepción:', emailError.message)
        await prisma.notificacion.create({
          data: { ordenId: orden.id, tipo: 'correo', mensaje: `Fallo envío recepción: ${emailError.message}`, enviadoAt: new Date(), estado: 'fallido' }
        })
      }
    }

    res.status(201).json(orden)
  } catch (error) {
    next(error)
  }
}

const actualizarOrden = async (req, res, next) => {
  try {
    const { fechaEntrega, formaPago, anticipo, notas, urlFotos, items } = req.body
    const ordenId = parseInt(req.params.id)
    const updateData = {}

    if (fechaEntrega  !== undefined) updateData.fechaEntrega = fechaEntrega ? new Date(fechaEntrega) : null
    if (formaPago     !== undefined) updateData.formaPago    = formaPago
    if (anticipo      !== undefined) updateData.anticipo     = parseFloat(anticipo)
    if (notas         !== undefined) updateData.notas        = notas
    if (urlFotos      !== undefined) updateData.urlFotos     = urlFotos || null

    if (items) {
      if (items.length > 12) {
        return res.status(400).json({ mensaje: 'Máximo 12 artículos por orden' })
      }
      updateData.total = items.reduce((sum, item) => sum + parseFloat(item.precio || 0), 0)
      await prisma.itemOrden.deleteMany({ where: { ordenId } })
      updateData.items = { create: items.map(mapearItem) }
    }

    const orden = await prisma.orden.update({
      where: { id: ordenId },
      data: updateData,
      include: { cliente: true, items: true }
    })
    res.json(orden)
  } catch (error) {
    next(error)
  }
}

const cambiarEstado = async (req, res, next) => {
  try {
    const { estado, urlFotosListo } = req.body
    const ordenId    = parseInt(req.params.id)

    if (!ESTADOS_VALIDOS.includes(estado)) {
      return res.status(400).json({ mensaje: `Estado inválido. Opciones: ${ESTADOS_VALIDOS.join(', ')}` })
    }

    if (estado === 'listo' && !urlFotosListo) {
      return res.status(400).json({ mensaje: 'Se requiere la URL de fotografías para marcar la orden como lista' })
    }

    const dataUpdate = { estado }
    if (estado === 'listo') dataUpdate.urlFotosListo = urlFotosListo

    const orden = await prisma.orden.update({
      where: { id: ordenId },
      data: dataUpdate,
      include: { cliente: true, items: true }
    })

    if (estado === 'listo' && orden.cliente.correo) {
      try {
        const info = await enviarCorreoListoParaRecoger(orden)
        await prisma.notificacion.create({
          data: { ordenId, tipo: 'correo', mensaje: `Correo enviado a ${orden.cliente.correo}`, enviadoAt: new Date(), estado: 'enviado' }
        })
        console.log(`Correo enviado: ${info.id}`)
      } catch (emailError) {
        console.error('Error al enviar correo:', emailError.message)
        await prisma.notificacion.create({
          data: { ordenId, tipo: 'correo', mensaje: `Fallo: ${emailError.message}`, enviadoAt: new Date(), estado: 'fallido' }
        })
      }
    }
    res.json(orden)
  } catch (error) {
    next(error)
  }
}

const eliminarOrden = async (req, res, next) => {
  try {
    await prisma.orden.delete({ where: { id: parseInt(req.params.id) } })
    res.json({ mensaje: 'Orden eliminada' })
  } catch (error) {
    next(error)
  }
}

module.exports = { previsualizarNumero, listarOrdenes, obtenerOrden, buscarPorNumero, crearOrden, actualizarOrden, cambiarEstado, eliminarOrden }
