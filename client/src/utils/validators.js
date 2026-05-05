export const validarOrden = (datos) => {
  const errores = {}
  if (!datos.clienteId) errores.clienteId = 'El cliente es requerido'
  if (!datos.fechaIngreso) errores.fechaIngreso = 'La fecha de ingreso es requerida'
  if (!datos.items || datos.items.length === 0)
    errores.items = 'Debe agregar al menos un par de tenis'
  if (datos.items && datos.items.length > 5)
    errores.items = 'Máximo 5 pares por orden'
  return errores
}

export const validarCliente = (datos) => {
  const errores = {}
  if (!datos.nombre?.trim()) errores.nombre = 'El nombre es requerido'
  return errores
}
