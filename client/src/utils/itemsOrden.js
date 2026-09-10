// Catálogo de servicios, precios y reglas de un artículo de orden, más las
// conversiones entre el estado del formulario y lo que viaja a la API.
// Vive aparte del componente para no romper el hot-reload de Vite, que exige
// que un archivo de componentes solo exporte componentes.

export const MAX_ITEMS = 12

export const SERVICIOS_TENIS = [
  'Lavado básico',
  'Lavado premium',
  'Limpieza express (color)',
  'Limpieza express (blancos)',
  'Restauración',
  'Otro',
]

export const PRECIO_SERVICIO = {
  'Lavado básico': 65,
  'Lavado premium': 85,
  'Limpieza express (color)': 100,
  'Limpieza express (blancos)': 120,
}

export const OPCIONES_RESTAURACION = [
  { id: 'pintura_tela',           label: 'Pintura completa de tela',         precio: 150 },
  { id: 'pintura_gamuza_total',   label: 'Pintura completa de Gamuza',       precio: 150 },
  { id: 'pintura_gamuza_parcial', label: 'Pintura parcial de Gamuza o tela', precio: 50  },
]

export const PEGADO_SUELA_PRECIO = 30

export const EXTRAS_RESTAURACION = [
  { id: 'desmanchado',          label: 'Desmanchado',              precio: 20 },
  { id: 'blanqueamientoSuelas', label: 'Blanqueamiento de suelas', precio: 30 },
  { id: 'impermeabilizacion',   label: 'Impermeabilización',       precio: 30 },
  { id: 'secadoExtra',          label: 'Secado extra',             precio: 10 },
]

export const PRODUCTOS_EXTRA = [
  { id: 'extraCintas',      label: 'Cintas',      precio: 10 },
  { id: 'extraPlantillas',  label: 'Plantillas',  precio: 10 },
  { id: 'extraDesodorante', label: 'Desodorante', precio: 40 },
]

export const TIPOS_TENIS     = ['Tennis', 'Botas', 'Casual de cuero', 'Crocs', 'Zapatillas', 'Otros']
export const TIPOS_ACCESORIO = ['Gorra', 'Mochila', 'Cartera', 'Bolso', 'Cinturón', 'Otro']
export const SERVICIOS_ACCESORIO = ['Limpieza básica', 'Limpieza profunda', 'Impermeabilización', 'Desinfección', 'Restauración', 'Otro']
export const TAMANOS = ['Pequeño', 'Mediano', 'Grande']

const ETIQUETAS_PRODUCTO = PRODUCTOS_EXTRA.map(p => p.label)

export const itemVacio = (tipo = 'tenis') => ({
  tipoItem: tipo,
  servicio: '', color: '', extras: '', precio: '',
  tipoZapato: '', talla: '', marca: '',
  tipoAccesorio: '', tamano: '',
  restauracionBase: '',
  pegadoSuela: false,
  desmanchado: false,
  blanqueamientoSuelas: false,
  impermeabilizacion: false,
  secadoExtra: false,
  extraCintas: false,
  extraPlantillas: false,
  extraDesodorante: false,
})

export const calcularPrecioRestauracion = (item) => {
  const base = OPCIONES_RESTAURACION.find(o => o.id === item.restauracionBase)
  let total = base ? base.precio : 0
  if (item.pegadoSuela) total += PEGADO_SUELA_PRECIO
  EXTRAS_RESTAURACION.forEach(e => { if (item[e.id]) total += e.precio })
  PRODUCTOS_EXTRA.forEach(p => { if (item[p.id]) total += p.precio })
  return total
}

// Devuelve el item con el cambio aplicado. Además del campo tocado recalcula el
// precio, porque servicio, restauración y productos extra lo determinan.
export const aplicarCambioItem = (item, campo, valor) => {
  if (campo === 'tipoItem') return itemVacio(valor)

  if (campo === 'servicio') {
    const precio = PRECIO_SERVICIO[valor]
    return {
      ...item,
      servicio: valor,
      precio: precio !== undefined ? String(precio) : '',
      restauracionBase: '',
      pegadoSuela: false,
      desmanchado: false,
      blanqueamientoSuelas: false,
      impermeabilizacion: false,
      secadoExtra: false,
      extraCintas: false,
      extraPlantillas: false,
      extraDesodorante: false,
    }
  }

  if (campo === 'restauracionBase') {
    const actualizado = { ...item, restauracionBase: valor }
    return { ...actualizado, precio: String(calcularPrecioRestauracion(actualizado)) }
  }

  if (campo === 'pegadoSuela' || EXTRAS_RESTAURACION.some(e => e.id === campo)) {
    const actualizado = { ...item, [campo]: valor }
    const total = calcularPrecioRestauracion(actualizado)
    return { ...actualizado, precio: total > 0 ? String(total) : '' }
  }

  if (PRODUCTOS_EXTRA.some(p => p.id === campo)) {
    const actualizado = { ...item, [campo]: valor }

    // En restauración el precio se arma completo desde las opciones marcadas; en
    // los demás servicios el producto se suma o resta sobre el precio actual.
    if (actualizado.servicio === 'Restauración') {
      const total = calcularPrecioRestauracion(actualizado)
      return { ...actualizado, precio: total > 0 ? String(total) : '' }
    }

    const extra = PRODUCTOS_EXTRA.find(p => p.id === campo)
    const base = parseFloat(item.precio || 0)
    const nuevoTotal = valor ? base + extra.precio : base - extra.precio
    return { ...actualizado, precio: nuevoTotal > 0 ? String(nuevoTotal) : '' }
  }

  return { ...item, [campo]: valor }
}

// La BD guarda un solo campo `extras`, así que las opciones marcadas se aplanan a
// texto: "Opción + Extra + Producto · observaciones del usuario".
export const serializarItemParaAPI = (item) => {
  const productosTexto = PRODUCTOS_EXTRA.filter(p => item[p.id]).map(p => p.label)

  if (item.servicio === 'Restauración') {
    const base = OPCIONES_RESTAURACION.find(o => o.id === item.restauracionBase)
    const partes = []
    if (base) partes.push(base.label)
    if (item.pegadoSuela) partes.push('Pegado de suela')
    EXTRAS_RESTAURACION.forEach(e => { if (item[e.id]) partes.push(e.label) })
    partes.push(...productosTexto)

    const descripcion = partes.join(' + ')
    return {
      ...item,
      extras: descripcion
        ? (item.extras ? `${descripcion} · ${item.extras}` : descripcion)
        : item.extras,
    }
  }

  if (productosTexto.length > 0) {
    const descripcion = productosTexto.join(' + ')
    return {
      ...item,
      extras: item.extras ? `${descripcion} · ${item.extras}` : descripcion,
    }
  }

  return item
}

// Inversa de serializarItemParaAPI: reconstruye las casillas marcadas a partir
// del texto guardado, para poder editar una orden ya creada.
export const itemDesdeAPI = (item) => {
  const base = {
    ...itemVacio(item.tipoItem || 'tenis'),
    servicio:      item.servicio      || '',
    color:         item.color         || '',
    precio:        String(item.precio || ''),
    tipoZapato:    item.tipoZapato    || '',
    talla:         item.talla         || '',
    marca:         item.marca         || '',
    tipoAccesorio: item.tipoAccesorio || '',
    tamano:        item.tamano        || '',
    extras:        item.extras        || '',
  }

  const extrasTexto = item.extras || ''
  const sepIdx = extrasTexto.indexOf(' · ')
  const estructurado  = sepIdx >= 0 ? extrasTexto.slice(0, sepIdx) : extrasTexto
  const observaciones = sepIdx >= 0 ? extrasTexto.slice(sepIdx + 3) : ''
  const partes = estructurado.split(' + ')

  const marcarProductos = () => {
    PRODUCTOS_EXTRA.forEach(p => { if (partes.includes(p.label)) base[p.id] = true })
  }

  if (item.servicio === 'Restauración') {
    const opcionBase = OPCIONES_RESTAURACION.find(o => partes.includes(o.label))
    if (opcionBase) base.restauracionBase = opcionBase.id
    if (partes.includes('Pegado de suela')) base.pegadoSuela = true
    EXTRAS_RESTAURACION.forEach(e => { if (partes.includes(e.label)) base[e.id] = true })
    marcarProductos()
    base.extras = observaciones
  } else if (sepIdx >= 0) {
    // Formato "Cintas + Plantillas · observaciones"
    marcarProductos()
    base.extras = observaciones
  } else {
    // Sin separador: o son puros productos, o son puras observaciones
    const todosSonProductos = partes.length > 0 && partes.every(p => ETIQUETAS_PRODUCTO.includes(p))
    if (todosSonProductos && extrasTexto) {
      marcarProductos()
      base.extras = ''
    } else {
      base.extras = extrasTexto
    }
  }

  return base
}
