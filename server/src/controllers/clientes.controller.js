const { db } = require('../lib/db')
const { clientes, ordenes } = require('../lib/schema')
const { eq, or, like, asc, desc, count } = require('drizzle-orm')
const { findOrdenes } = require('../lib/helpers')

const listarClientes = async (req, res, next) => {
  try {
    const { buscar } = req.query

    const whereClause = buscar
      ? or(
          like(clientes.nombre,   `%${buscar}%`),
          like(clientes.telefono, `%${buscar}%`),
          like(clientes.nit,      `%${buscar}%`),
          like(clientes.correo,   `%${buscar}%`)
        )
      : undefined

    const [clientesList, ordenesCounts] = await Promise.all([
      db.select().from(clientes).where(whereClause).orderBy(asc(clientes.nombre)),
      db.select({ clienteId: ordenes.clienteId, total: count() })
        .from(ordenes)
        .groupBy(ordenes.clienteId),
    ])

    const countMap = {}
    for (const row of ordenesCounts) {
      countMap[row.clienteId] = Number(row.total)
    }

    const result = clientesList.map(c => ({
      ...c,
      _count: { ordenes: countMap[c.id] || 0 },
    }))

    res.json(result)
  } catch (error) {
    next(error)
  }
}

const obtenerCliente = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id)
    const rows = await db.select().from(clientes).where(eq(clientes.id, id))
    if (!rows.length) {
      const err = new Error('Registro no encontrado')
      err.code = 'NOT_FOUND'
      throw err
    }
    res.json(rows[0])
  } catch (error) {
    next(error)
  }
}

const obtenerOrdenesCliente = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id)
    const result = await findOrdenes({
      where:   eq(ordenes.clienteId, id),
      with:    { items: true },
      orderBy: [desc(ordenes.createdAt)],
    })
    res.json(result)
  } catch (error) {
    next(error)
  }
}

const crearCliente = async (req, res, next) => {
  try {
    const { nombre, telefono, nit, direccion, correo, genero, fechaNacimiento } = req.body

    if (!nombre) {
      return res.status(400).json({ mensaje: 'El nombre es requerido' })
    }

    const [{ id }] = await db.insert(clientes).values({
      nombre,
      telefono:        telefono || null,
      nit:             nit || 'CF',
      direccion:       direccion || null,
      correo:          correo || null,
      genero:          genero || null,
      fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null,
    }).$returningId()

    const rows = await db.select().from(clientes).where(eq(clientes.id, id))
    res.status(201).json(rows[0])
  } catch (error) {
    next(error)
  }
}

const actualizarCliente = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id)
    const { nombre, telefono, nit, direccion, correo, genero, fechaNacimiento } = req.body

    await db.update(clientes).set({
      nombre,
      telefono:        telefono || null,
      nit,
      direccion:       direccion || null,
      correo:          correo || null,
      genero:          genero || null,
      fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null,
    }).where(eq(clientes.id, id))

    const rows = await db.select().from(clientes).where(eq(clientes.id, id))
    if (!rows.length) {
      const err = new Error('Registro no encontrado')
      err.code = 'NOT_FOUND'
      throw err
    }
    res.json(rows[0])
  } catch (error) {
    next(error)
  }
}

const eliminarCliente = async (req, res, next) => {
  try {
    await db.delete(clientes).where(eq(clientes.id, parseInt(req.params.id)))
    res.json({ mensaje: 'Cliente eliminado' })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  listarClientes,
  obtenerCliente,
  obtenerOrdenesCliente,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
}
