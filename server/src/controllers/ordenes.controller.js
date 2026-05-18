const { db } = require('../lib/db')
const { clientes, ordenes, itemsOrden, notificaciones } = require('../lib/schema')
const { eq, or, like, and, inArray, desc, asc } = require('drizzle-orm')
const { generarNumeroOrden } = require('../utils/numeroOrden')
const { enviarCorreoOrdenRecibida, enviarCorreoListoParaRecoger, enviarCorreoExpressListo } = require('../services/email.service')

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

    let whereClause

    if (estado && buscar) {
      // Find matching clienteIds first
      const clienteRows = await db
        .select({ id: clientes.id })
        .from(clientes)
        .where(like(clientes.nombre, `%${buscar}%`))
      const clienteIds = clienteRows.map(c => c.id)

      const orConditions = [like(ordenes.numeroOrden, `%${buscar}%`)]
      if (clienteIds.length) {
        orConditions.push(inArray(ordenes.clienteId, clienteIds))
      }

      whereClause = and(
        eq(ordenes.estado, estado),
        or(...orConditions)
      )
    } else if (estado) {
      whereClause = eq(ordenes.estado, estado)
    } else if (buscar) {
      const clienteRows = await db
        .select({ id: clientes.id })
        .from(clientes)
        .where(like(clientes.nombre, `%${buscar}%`))
      const clienteIds = clienteRows.map(c => c.id)

      const orConditions = [like(ordenes.numeroOrden, `%${buscar}%`)]
      if (clienteIds.length) {
        orConditions.push(inArray(ordenes.clienteId, clienteIds))
      }
      whereClause = or(...orConditions)
    }

    const result = await db.query.ordenes.findMany({
      where:   whereClause,
      with:    { cliente: true, items: true },
      orderBy: [desc(ordenes.createdAt)],
    })

    res.json(result)
  } catch (error) {
    next(error)
  }
}

const obtenerOrden = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id)
    const orden = await db.query.ordenes.findFirst({
      where: eq(ordenes.id, id),
      with:  { cliente: true, items: true, notificaciones: true },
    })
    if (!orden) {
      const err = new Error('Registro no encontrado')
      err.code = 'NOT_FOUND'
      throw err
    }
    res.json(orden)
  } catch (error) {
    next(error)
  }
}

const buscarPorNumero = async (req, res, next) => {
  try {
    const orden = await db.query.ordenes.findFirst({
      where: eq(ordenes.numeroOrden, req.params.numero),
      with:  { cliente: true, items: true },
    })
    if (!orden) {
      const err = new Error('Registro no encontrado')
      err.code = 'NOT_FOUND'
      throw err
    }
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

    await db.transaction(async (tx) => {
      const [{ id: ordenId }] = await tx.insert(ordenes).values({
        numeroOrden,
        clienteId:    parseInt(clienteId),
        fechaIngreso: new Date(fechaIngreso),
        fechaEntrega: fechaEntrega ? new Date(fechaEntrega) : null,
        formaPago:    formaPago || null,
        anticipo:     parseFloat(anticipo || 0),
        total,
        notas:        notas || null,
        urlFotos:     urlFotos || null,
        estado:       'pendiente',
      }).$returningId()

      if (itemsData.length) {
        await tx.insert(itemsOrden).values(
          itemsData.map(i => ({ ...mapearItem(i), ordenId }))
        )
      }
    })

    const orden = await db.query.ordenes.findFirst({
      where: eq(ordenes.numeroOrden, numeroOrden),
      with:  { cliente: true, items: true },
    })

    if (orden.cliente.correo) {
      try {
        await enviarCorreoOrdenRecibida(orden)
        await db.insert(notificaciones).values({
          ordenId: orden.id,
          tipo:     'correo',
          mensaje:  `Confirmación de recepción enviada a ${orden.cliente.correo}`,
          enviadoAt: new Date(),
          estado:   'enviado',
        })
      } catch (emailError) {
        console.error('Error al enviar correo de recepción:', emailError.message)
        await db.insert(notificaciones).values({
          ordenId: orden.id,
          tipo:     'correo',
          mensaje:  `Fallo envío recepción: ${emailError.message}`,
          enviadoAt: new Date(),
          estado:   'fallido',
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

    if (items) {
      if (items.length > 12) {
        return res.status(400).json({ mensaje: 'Máximo 12 artículos por orden' })
      }

      const total = items.reduce((sum, item) => sum + parseFloat(item.precio || 0), 0)
      const updateData = { total }
      if (fechaEntrega  !== undefined) updateData.fechaEntrega = fechaEntrega ? new Date(fechaEntrega) : null
      if (formaPago     !== undefined) updateData.formaPago    = formaPago
      if (anticipo      !== undefined) updateData.anticipo     = parseFloat(anticipo)
      if (notas         !== undefined) updateData.notas        = notas
      if (urlFotos      !== undefined) updateData.urlFotos     = urlFotos || null

      await db.transaction(async (tx) => {
        await tx.update(ordenes).set(updateData).where(eq(ordenes.id, ordenId))
        await tx.delete(itemsOrden).where(eq(itemsOrden.ordenId, ordenId))
        await tx.insert(itemsOrden).values(
          items.map(i => ({ ...mapearItem(i), ordenId }))
        )
      })
    } else {
      const updateData = {}
      if (fechaEntrega  !== undefined) updateData.fechaEntrega = fechaEntrega ? new Date(fechaEntrega) : null
      if (formaPago     !== undefined) updateData.formaPago    = formaPago
      if (anticipo      !== undefined) updateData.anticipo     = parseFloat(anticipo)
      if (notas         !== undefined) updateData.notas        = notas
      if (urlFotos      !== undefined) updateData.urlFotos     = urlFotos || null

      if (Object.keys(updateData).length) {
        await db.update(ordenes).set(updateData).where(eq(ordenes.id, ordenId))
      }
    }

    const orden = await db.query.ordenes.findFirst({
      where: eq(ordenes.id, ordenId),
      with:  { cliente: true, items: true },
    })
    res.json(orden)
  } catch (error) {
    next(error)
  }
}

const cambiarEstado = async (req, res, next) => {
  try {
    const { estado, urlFotosListo, entregaParcial } = req.body
    const ordenId = parseInt(req.params.id)

    if (!ESTADOS_VALIDOS.includes(estado)) {
      return res.status(400).json({ mensaje: `Estado inválido. Opciones: ${ESTADOS_VALIDOS.join(', ')}` })
    }

    if (estado === 'listo' && !urlFotosListo) {
      return res.status(400).json({ mensaje: 'Se requiere la URL de fotografías para marcar la orden como lista' })
    }

    const dataUpdate = { estado }
    if (estado === 'listo') dataUpdate.urlFotosListo = urlFotosListo

    await db.update(ordenes).set(dataUpdate).where(eq(ordenes.id, ordenId))

    const orden = await db.query.ordenes.findFirst({
      where: eq(ordenes.id, ordenId),
      with:  { cliente: true, items: true },
    })

    if (estado === 'listo' && orden.cliente.correo) {
      try {
        let info
        let mensaje

        if (entregaParcial) {
          info = await enviarCorreoExpressListo(orden)
          mensaje = `Correo de express listos enviado a ${orden.cliente.correo}`
        } else {
          info = await enviarCorreoListoParaRecoger(orden)
          mensaje = `Correo enviado a ${orden.cliente.correo}`
        }

        await db.insert(notificaciones).values({
          ordenId,
          tipo:     'correo',
          mensaje,
          enviadoAt: new Date(),
          estado:   'enviado',
        })
        console.log(`Correo enviado: ${info.id}`)
      } catch (emailError) {
        console.error('Error al enviar correo:', emailError.message)
        await db.insert(notificaciones).values({
          ordenId,
          tipo:     'correo',
          mensaje:  `Fallo: ${emailError.message}`,
          enviadoAt: new Date(),
          estado:   'fallido',
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
    await db.delete(ordenes).where(eq(ordenes.id, parseInt(req.params.id)))
    res.json({ mensaje: 'Orden eliminada' })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  previsualizarNumero,
  listarOrdenes,
  obtenerOrden,
  buscarPorNumero,
  crearOrden,
  actualizarOrden,
  cambiarEstado,
  eliminarOrden,
}
