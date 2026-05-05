const prisma = require('../lib/prisma')

const listarClientes = async (req, res, next) => {
  try {
    const { buscar } = req.query
    const where = buscar
      ? {
          OR: [
            { nombre: { contains: buscar } },
            { telefono: { contains: buscar } },
            { nit: { contains: buscar } },
            { correo: { contains: buscar } }
          ]
        }
      : {}

    const clientes = await prisma.cliente.findMany({
      where,
      orderBy: { nombre: 'asc' },
      include: { _count: { select: { ordenes: true } } }
    })

    res.json(clientes)
  } catch (error) {
    next(error)
  }
}

const obtenerCliente = async (req, res, next) => {
  try {
    const cliente = await prisma.cliente.findUniqueOrThrow({
      where: { id: parseInt(req.params.id) }
    })
    res.json(cliente)
  } catch (error) {
    next(error)
  }
}

const obtenerOrdenesCliente = async (req, res, next) => {
  try {
    const ordenes = await prisma.orden.findMany({
      where: { clienteId: parseInt(req.params.id) },
      include: { items: true },
      orderBy: { createdAt: 'desc' }
    })
    res.json(ordenes)
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

    const cliente = await prisma.cliente.create({
      data: {
        nombre, telefono, nit: nit || 'CF', direccion, correo,
        genero: genero || null,
        fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null
      }
    })

    res.status(201).json(cliente)
  } catch (error) {
    next(error)
  }
}

const actualizarCliente = async (req, res, next) => {
  try {
    const { nombre, telefono, nit, direccion, correo, genero, fechaNacimiento } = req.body
    const cliente = await prisma.cliente.update({
      where: { id: parseInt(req.params.id) },
      data: {
        nombre, telefono, nit, direccion, correo,
        genero: genero || null,
        fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null
      }
    })
    res.json(cliente)
  } catch (error) {
    next(error)
  }
}

const eliminarCliente = async (req, res, next) => {
  try {
    await prisma.cliente.delete({ where: { id: parseInt(req.params.id) } })
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
  eliminarCliente
}
