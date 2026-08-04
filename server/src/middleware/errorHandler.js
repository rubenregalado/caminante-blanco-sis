const errorHandler = (err, req, res, next) => {
  console.error(err.stack)

  if (err.code === 'NOT_FOUND') {
    return res.status(404).json({ mensaje: 'Registro no encontrado' })
  }

  if (err.errno === 1062 || err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ mensaje: 'Ya existe un registro con ese valor único' })
  }

  // Llave foránea: pasa al borrar un cliente que todavía tiene órdenes.
  if (err.errno === 1451 || err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({
      mensaje: 'No se puede eliminar: el registro tiene órdenes asociadas',
    })
  }

  const status = err.status || 500

  // Los 500 suelen traer detalles de MySQL o rutas internas; se quedan en el log.
  res.status(status).json({
    mensaje: status === 500
      ? 'Error interno del servidor'
      : (err.message || 'Error interno del servidor'),
  })
}

module.exports = errorHandler
