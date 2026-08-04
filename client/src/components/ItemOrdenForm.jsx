// Fuente única de la definición de un artículo de orden: catálogo de servicios y
// precios, formulario, y las conversiones entre el estado del formulario y lo que
// viaja a la API. Lo usan OrdenNueva y OrdenEditar.

const IconShoe = () => (
  <svg width="16" height="14" viewBox="0 0 32 20" fill="currentColor">
    <path d="M2 14C2 14 4 10 6 9L8 6L10.5 8.5L13.5 7L17 10L21 9C23 9 27 10.5 29 13C30 13.5 30 14 30 14H2Z"/>
    <rect x="1" y="14" width="30" height="5" rx="2.5"/>
  </svg>
)

const IconBag = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
)

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

export function BotonAgregarItem({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full mt-3 py-3 rounded-lg border-2 border-dashed text-sm font-semibold transition-all hover:border-solid"
      style={{ borderColor: '#D1D5DB', color: '#6B7280', backgroundColor: 'transparent' }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = '#3B30D0'
        e.currentTarget.style.color = '#3B30D0'
        e.currentTarget.style.backgroundColor = '#F0EEFF'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = '#D1D5DB'
        e.currentTarget.style.color = '#6B7280'
        e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      + Agregar artículo
    </button>
  )
}

export default function ItemOrdenForm({ item, idx, onChange, onQuitar, puedeQuitar }) {
  const esTenis        = item.tipoItem === 'tenis'
  const esAccesorio    = item.tipoItem === 'accesorio'
  const esRestauracion = esTenis && item.servicio === 'Restauración'

  const campo = (key, label, opts = {}) => (
    <div>
      <label className="text-xs text-gray-500 mb-1 block">{label}</label>
      {opts.opciones ? (
        <select
          value={item[key] || ''}
          onChange={e => onChange(idx, key, e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-gray-400"
        >
          <option value="">Seleccionar...</option>
          {opts.opciones.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type={opts.type || 'text'}
          value={item[key] || ''}
          onChange={e => onChange(idx, key, e.target.value)}
          placeholder={opts.placeholder || ''}
          readOnly={opts.readOnly}
          className={`w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:border-gray-400 ${opts.readOnly ? 'bg-gray-50 text-gray-600 cursor-default' : ''}`}
        />
      )}
    </div>
  )

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Cabecera */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => onChange(idx, 'tipoItem', 'tenis')}
              className="px-3 py-1.5 transition-colors flex items-center gap-1.5"
              style={esTenis ? { backgroundColor: '#3B30D0', color: '#fff' } : { backgroundColor: '#fff', color: '#6B7280' }}
            >
              <IconShoe /> Zapatos
            </button>
            <button
              type="button"
              onClick={() => onChange(idx, 'tipoItem', 'accesorio')}
              className="px-3 py-1.5 transition-colors flex items-center gap-1.5"
              style={esAccesorio ? { backgroundColor: '#3DDBA0', color: '#1a5c42' } : { backgroundColor: '#fff', color: '#6B7280' }}
            >
              <IconBag /> Accesorio
            </button>
          </div>
          <span className="text-sm font-medium text-gray-700">
            {esTenis ? `Par #${idx + 1}` : `Accesorio #${idx + 1}`}
          </span>
        </div>
        {puedeQuitar && (
          <button type="button" onClick={() => onQuitar(idx)} className="text-xs text-red-400 hover:text-red-600">
            Quitar
          </button>
        )}
      </div>

      {/* Campos */}
      <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
        {esTenis && <>
          {campo('servicio',   'Servicio',       { opciones: SERVICIOS_TENIS })}
          {campo('tipoZapato', 'Tipo de zapato', { opciones: TIPOS_TENIS })}
          {campo('marca',      'Marca',           { placeholder: 'Nike, Adidas...' })}
          {campo('color',      'Color',           { placeholder: 'Blanco, Negro...' })}
          {campo('talla',      'Talla',           { placeholder: '42' })}
          {campo('precio',     'Precio (Q) *',    { type: 'number', placeholder: '0.00', readOnly: esRestauracion })}

          {esRestauracion && (
            <div className="col-span-2 md:col-span-3">
              <label className="text-xs text-gray-500 mb-2 block">Tipo de restauración</label>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
                {OPCIONES_RESTAURACION.map(op => (
                  <label key={op.id} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name={`restauracion-${idx}`}
                      value={op.id}
                      checked={item.restauracionBase === op.id}
                      onChange={() => onChange(idx, 'restauracionBase', op.id)}
                      className="accent-indigo-700"
                    />
                    <span className="text-sm text-gray-700 flex-1">{op.label}</span>
                    <span className="text-xs font-semibold" style={{ color: '#3B30D0' }}>Q{op.precio}</span>
                  </label>
                ))}
                <div className="border-t border-gray-200 pt-2 space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!item.pegadoSuela}
                      onChange={e => onChange(idx, 'pegadoSuela', e.target.checked)}
                      className="accent-indigo-700"
                    />
                    <span className="text-sm text-gray-700 flex-1">Pegado de suela</span>
                    <span className="text-xs font-semibold" style={{ color: '#3B30D0' }}>Q{PEGADO_SUELA_PRECIO}</span>
                  </label>
                  {EXTRAS_RESTAURACION.map(e => (
                    <label key={e.id} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!item[e.id]}
                        onChange={ev => onChange(idx, e.id, ev.target.checked)}
                        className="accent-indigo-700"
                      />
                      <span className="text-sm text-gray-700 flex-1">{e.label}</span>
                      <span className="text-xs font-semibold" style={{ color: '#3B30D0' }}>Q{e.precio}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="col-span-2 md:col-span-3">
            <label className="text-xs text-gray-500 mb-2 block">Extras</label>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 flex flex-wrap gap-x-6 gap-y-2">
              {PRODUCTOS_EXTRA.map(p => (
                <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!item[p.id]}
                    onChange={e => onChange(idx, p.id, e.target.checked)}
                    className="accent-indigo-700"
                  />
                  <span className="text-sm text-gray-700">{p.label}</span>
                  <span className="text-xs font-semibold" style={{ color: '#3B30D0' }}>Q{p.precio}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="col-span-2 md:col-span-3">
            {campo('extras', 'Observaciones', { placeholder: 'Manchas especiales, decoloración...' })}
          </div>
        </>}

        {esAccesorio && <>
          {campo('tipoAccesorio', 'Tipo de accesorio', { opciones: TIPOS_ACCESORIO })}
          {campo('servicio',      'Tipo de servicio',  { opciones: SERVICIOS_ACCESORIO })}
          {campo('tamano',        'Tamaño',             { opciones: TAMANOS })}
          {campo('color',         'Color',              { placeholder: 'Negro, Café...' })}
          {campo('precio',        'Precio (Q) *',       { type: 'number', placeholder: '0.00' })}
          <div className="col-span-2 md:col-span-3">
            {campo('extras', 'Observaciones', { placeholder: 'Estado, manchas especiales...' })}
          </div>
        </>}
      </div>
    </div>
  )
}
