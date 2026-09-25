const { db } = require('../lib/db')
const { clientes, ordenes } = require('../lib/schema')
const { eq, ne, or, and, like, asc, desc, count, sql } = require('drizzle-orm')
const { findOrdenes } = require('../lib/helpers')
const {
  normalizarTelefono,
  normalizarNombre,
  normalizarCorreo,
  SQL_TELEFONO_DIGITOS,
} = require('../lib/normalizar')

// Busca clientes que ya existan con el mismo teléfono, correo o nombre.
// Se usa al crear y al editar para avisar antes de generar un duplicado.
// `excluirId` evita que un cliente se detecte a sí mismo al editarlo.
const buscarCoincidencias = async ({ nombre, telefono, correo, excluirId }) => {
  const criterios = []

  const tel = normalizarTelefono(telefono)
  if (tel) {
    criterios.push(sql`${sql.raw(SQL_TELEFONO_DIGITOS)} = ${tel}`)
  }

  const mail = normalizarCorreo(correo)
  if (mail) {
    criterios.push(sql`LOWER(TRIM(correo)) = ${mail}`)
  }

  const nom = normalizarNombre(nombre)
  if (nom) {
    criterios.push(sql`LOWER(TRIM(nombre)) = ${nom.toLowerCase()}`)
  }

  if (!criterios.length) return []

  const where = excluirId
    ? and(or(...criterios), ne(clientes.id, excluirId))
    : or(...criterios)

  return db.select().from(clientes).where(where).limit(5)
}

// Explica en palabras por qué se considera duplicado, para que el mostrador
// vea de inmediato si es la misma persona o un homónimo.
const describirCoincidencia = (existente, { nombre, telefono, correo }) => {
  const tel = normalizarTelefono(telefono)
  if (tel && normalizarTelefono(existente.telefono) === tel) return 'el mismo teléfono'

  const mail = normalizarCorreo(correo)
  if (mail && normalizarCorreo(existente.correo) === mail) return 'el mismo correo'

  const nom = normalizarNombre(nombre)
  if (nom && normalizarNombre(existente.nombre)?.toLowerCase() === nom.toLowerCase()) {
    return 'el mismo nombre'
  }
  return 'datos parecidos'
}

const listarClientes = async (req, res, next) => {
  try {
    const { buscar } = req.query
    const termino = buscar ? buscar.trim() : ''

    let whereClause
    if (termino) {
      const criterios = [
        like(clientes.nombre, `%${termino}%`),
        like(clientes.nit,    `%${termino}%`),
        like(clientes.correo, `%${termino}%`),
      ]

      // Si el término trae dígitos, comparar contra el teléfono ya sin guiones
      // ni espacios: así "5555-1234", "+502 5555 1234" y "55551234" encuentran
      // todos al mismo cliente. Antes solo coincidía la forma exacta guardada.
      const digitos = termino.replace(/\D/g, '')
      if (digitos) {
        criterios.push(sql`${sql.raw(SQL_TELEFONO_DIGITOS)} LIKE ${'%' + digitos + '%'}`)
      } else {
        criterios.push(like(clientes.telefono, `%${termino}%`))
      }

      whereClause = or(...criterios)
    }

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

    const nombreLimpio = normalizarNombre(nombre)
    if (!nombreLimpio) {
      return res.status(400).json({ mensaje: 'El nombre es requerido' })
    }

    // Aviso de duplicado. No bloquea: hay casos legítimos (dos hermanos con el
    // mismo teléfono de casa), por eso el mostrador puede insistir con
    // ?forzar=1 y el cliente se crea igual.
    if (req.query.forzar !== '1') {
      const coincidencias = await buscarCoincidencias({ nombre: nombreLimpio, telefono, correo })
      if (coincidencias.length) {
        return res.status(409).json({
          codigo:  'CLIENTE_DUPLICADO',
          mensaje: `Ya existe un cliente con ${describirCoincidencia(coincidencias[0], { nombre: nombreLimpio, telefono, correo })}.`,
          clientes: coincidencias,
        })
      }
    }

    const [{ id }] = await db.insert(clientes).values({
      nombre:          nombreLimpio,
      telefono:        telefono ? String(telefono).trim() : null,
      nit:             nit ? String(nit).trim() : 'CF',
      direccion:       direccion ? String(direccion).trim() : null,
      correo:          normalizarCorreo(correo),
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

    const existentes = await db.select().from(clientes).where(eq(clientes.id, id))
    if (!existentes.length) {
      const err = new Error('Registro no encontrado')
      err.code = 'NOT_FOUND'
      throw err
    }

    // Solo se tocan los campos que vengan en la petición. Antes se reescribían
    // todas las columnas con `campo || null`, así que una actualización parcial
    // borraba en silencio el correo, el teléfono y la fecha de nacimiento.
    const datos = {}

    if (req.body.nombre !== undefined) {
      const nombreLimpio = normalizarNombre(req.body.nombre)
      if (!nombreLimpio) {
        return res.status(400).json({ mensaje: 'El nombre es requerido' })
      }
      datos.nombre = nombreLimpio
    }
    if (req.body.telefono  !== undefined) datos.telefono  = req.body.telefono  ? String(req.body.telefono).trim()  : null
    if (req.body.nit       !== undefined) datos.nit       = req.body.nit       ? String(req.body.nit).trim()       : null
    if (req.body.direccion !== undefined) datos.direccion = req.body.direccion ? String(req.body.direccion).trim() : null
    if (req.body.correo    !== undefined) datos.correo    = normalizarCorreo(req.body.correo)
    if (req.body.genero    !== undefined) datos.genero    = req.body.genero || null
    if (req.body.fechaNacimiento !== undefined) {
      datos.fechaNacimiento = req.body.fechaNacimiento ? new Date(req.body.fechaNacimiento) : null
    }

    if (Object.keys(datos).length) {
      await db.update(clientes).set(datos).where(eq(clientes.id, id))
    }

    const rows = await db.select().from(clientes).where(eq(clientes.id, id))
    res.json(rows[0])
  } catch (error) {
    next(error)
  }
}

// Busca posibles duplicados de un cliente ya guardado, para la pantalla de
// detalle. Permite detectarlos sin tener que entrar a la base.
const posiblesDuplicados = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id)
    const rows = await db.select().from(clientes).where(eq(clientes.id, id))
    if (!rows.length) {
      const err = new Error('Registro no encontrado')
      err.code = 'NOT_FOUND'
      throw err
    }

    const cliente = rows[0]
    const coincidencias = await buscarCoincidencias({
      nombre:    cliente.nombre,
      telefono:  cliente.telefono,
      correo:    cliente.correo,
      excluirId: id,
    })

    res.json(coincidencias)
  } catch (error) {
    next(error)
  }
}

const eliminarCliente = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id)

    // La llave foránea ya rechaza borrar un cliente con órdenes, pero el error
    // de MySQL no dice nada útil. Mejor avisar con claridad y de paso dejar
    // constancia de cuántas órdenes se habrían perdido de vista.
    const [{ total }] = await db
      .select({ total: count() })
      .from(ordenes)
      .where(eq(ordenes.clienteId, id))

    if (Number(total) > 0) {
      return res.status(409).json({
        codigo:  'CLIENTE_CON_ORDENES',
        mensaje: `No se puede eliminar: el cliente tiene ${total} orden(es) en su historial.`,
      })
    }

    await db.delete(clientes).where(eq(clientes.id, id))
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
  posiblesDuplicados,
  eliminarCliente,
}
