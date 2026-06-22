const { db } = require('../lib/db')
const { clientes, ordenes, itemsOrden, notificaciones } = require('../lib/schema')
const { eq, or, like, and, inArray, desc, asc, gte, lt } = require('drizzle-orm')
const { findOrden, findOrdenes } = require('../lib/helpers')
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
    const { estado, buscar, fechaDesde, fechaHasta } = req.query

    // Resolver clienteIds si hay búsqueda por texto
    let clienteIds = null
    if (buscar) {
      const clienteRows = await db
        .select({ id: clientes.id })
        .from(clientes)
        .where(like(clientes.nombre, `%${buscar}%`))
      clienteIds = clienteRows.map(c => c.id)
    }

    const condiciones = []

    if (estado) condiciones.push(eq(ordenes.estado, estado))

    if (buscar) {
      const orCond = [like(ordenes.numeroOrden, `%${buscar}%`)]
      if (clienteIds.length) orCond.push(inArray(ordenes.clienteId, clienteIds))
      condiciones.push(or(...orCond))
    }

    if (fechaDesde) condiciones.push(gte(ordenes.createdAt, new Date(fechaDesde)))
    if (fechaHasta) {
      const hasta = new Date(fechaHasta)
      hasta.setDate(hasta.getDate() + 1) // incluir el día completo
      condiciones.push(lt(ordenes.createdAt, hasta))
    }

    const whereClause = condiciones.length === 0 ? undefined
      : condiciones.length === 1 ? condiciones[0]
      : and(...condiciones)

    const result = await findOrdenes({
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
    const orden = await findOrden(eq(ordenes.id, id), { cliente: true, items: true, notificaciones: true })
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
    const orden = await findOrden(eq(ordenes.numeroOrden, req.params.numero), { cliente: true, items: true })
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

    const orden = await findOrden(eq(ordenes.numeroOrden, numeroOrden), { cliente: true, items: true })

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

    const orden = await findOrden(eq(ordenes.id, ordenId), { cliente: true, items: true })
    res.json(orden)
  } catch (error) {
    next(error)
  }
}

const cambiarEstado = async (req, res, next) => {
  try {
    const { estado, urlFotosListo, entregaParcial, pagoEfectivo, pagoTransferencia, pagoTarjeta } = req.body
    const ordenId = parseInt(req.params.id)

    if (!ESTADOS_VALIDOS.includes(estado)) {
      return res.status(400).json({ mensaje: `Estado inválido. Opciones: ${ESTADOS_VALIDOS.join(', ')}` })
    }

    if (estado === 'listo' && !urlFotosListo) {
      return res.status(400).json({ mensaje: 'Se requiere la URL de fotografías para marcar la orden como lista' })
    }

    const dataUpdate = { estado }
    if (estado === 'listo') dataUpdate.urlFotosListo = urlFotosListo
    if (estado === 'entregado') {
      dataUpdate.fechaEntregado    = new Date()
      dataUpdate.pagoEfectivo      = parseFloat(pagoEfectivo      || 0)
      dataUpdate.pagoTransferencia = parseFloat(pagoTransferencia || 0)
      dataUpdate.pagoTarjeta       = parseFloat(pagoTarjeta       || 0)
    }

    await db.update(ordenes).set(dataUpdate).where(eq(ordenes.id, ordenId))

    const orden = await findOrden(eq(ordenes.id, ordenId), { cliente: true, items: true })

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

const actualizarFechaEntrega = async (req, res, next) => {
  try {
    const ordenId = parseInt(req.params.id)
    const { fechaEntrega } = req.body

    await db.update(ordenes)
      .set({ fechaEntrega: fechaEntrega ? new Date(fechaEntrega) : null })
      .where(eq(ordenes.id, ordenId))

    const orden = await findOrden(eq(ordenes.id, ordenId), { cliente: true, items: true })
    res.json(orden)
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
  actualizarFechaEntrega,
}
