import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { obtenerOrden, actualizarOrden } from '../api/ordenes'
import Layout from '../components/Layout'
import { formatearMoneda } from '../utils/formatters'

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

const SERVICIOS_TENIS = [
  'Lavado básico',
  'Lavado premium',
  'Limpieza express (color)',
  'Limpieza express (blancos)',
  'Restauración',
  'Otro',
]
const PRECIO_SERVICIO = {
  'Lavado básico': 65,
  'Lavado premium': 85,
  'Limpieza express (color)': 100,
  'Limpieza express (blancos)': 120,
}
const OPCIONES_RESTAURACION = [
  { id: 'pintura_tela',           label: 'Pintura completa de tela',          precio: 150 },
  { id: 'pintura_gamuza_total',   label: 'Pintura completa de Gamuza',         precio: 150 },
  { id: 'pintura_gamuza_parcial', label: 'Pintura parcial de Gamuza o tela',   precio: 50  },
]
const PEGADO_SUELA_PRECIO = 30
const EXTRAS_RESTAURACION = [
  { id: 'desmanchado',          label: 'Desmanchado',             precio: 20 },
  { id: 'blanqueamientoSuelas', label: 'Blanqueamiento de suelas', precio: 30 },
  { id: 'impermeabilizacion',   label: 'Impermeabilización',      precio: 30 },
  { id: 'secadoExtra',          label: 'Secado extra',            precio: 10 },
]
const PRODUCTOS_EXTRA = [
  { id: 'extraCintas',      label: 'Cintas',      precio: 10 },
  { id: 'extraPlantillas',  label: 'Plantillas',  precio: 10 },
  { id: 'extraDesodorante', label: 'Desodorante', precio: 40 },
]
const TIPOS_TENIS     = ['Tennis', 'Botas', 'Casual de cuero', 'Crocs', 'Zapatillas', 'Otros']
const TIPOS_ACCESORIO = ['Gorra', 'Mochila', 'Cartera', 'Bolso', 'Cinturón', 'Otro']
const SERVICIOS_ACCESORIO = ['Limpieza básica', 'Limpieza profunda', 'Impermeabilización', 'Desinfección', 'Restauración', 'Otro']
const TAMANOS         = ['Pequeño', 'Mediano', 'Grande']

const PRODUCT_LABELS = ['Cintas', 'Plantillas', 'Desodorante']

const calcularPrecioRestauracion = (item) => {
  const base = OPCIONES_RESTAURACION.find(o => o.id === item.restauracionBase)
  let total = base ? base.precio : 0
  if (item.pegadoSuela) total += PEGADO_SUELA_PRECIO
  EXTRAS_RESTAURACION.forEach(e => { if (item[e.id]) total += e.precio })
  PRODUCTOS_EXTRA.forEach(p => { if (item[p.id]) total += p.precio })
  return total
}

const itemVacio = (tipo = 'tenis') => ({
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

function itemDesdeAPI(item) {
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
  const estructurado = sepIdx >= 0 ? extrasTexto.slice(0, sepIdx) : extrasTexto
  const observaciones = sepIdx >= 0 ? extrasTexto.slice(sepIdx + 3) : ''
  const partes = estructurado.split(' + ')

  if (item.servicio === 'Restauración') {
    const opcionBase = OPCIONES_RESTAURACION.find(o => partes.includes(o.label))
    if (opcionBase) base.restauracionBase = opcionBase.id
    if (partes.includes('Pegado de suela'))          base.pegadoSuela          = true
    if (partes.includes('Desmanchado'))               base.desmanchado          = true
    if (partes.includes('Blanqueamiento de suelas'))  base.blanqueamientoSuelas = true
    if (partes.includes('Impermeabilización'))        base.impermeabilizacion   = true
    if (partes.includes('Secado extra'))              base.secadoExtra          = true
    if (partes.includes('Cintas'))                    base.extraCintas          = true
    if (partes.includes('Plantillas'))                base.extraPlantillas      = true
    if (partes.includes('Desodorante'))               base.extraDesodorante     = true
    base.extras = observaciones
  } else if (sepIdx >= 0) {
    // "Cintas + Plantillas · observaciones" format
    if (partes.includes('Cintas'))      base.extraCintas      = true
    if (partes.includes('Plantillas'))  base.extraPlantillas  = true
    if (partes.includes('Desodorante')) base.extraDesodorante = true
    base.extras = observaciones
  } else {
    // No separator: could be pure products or plain observaciones
    const todosSonProductos = partes.length > 0 && partes.every(p => PRODUCT_LABELS.includes(p))
    if (todosSonProductos && extrasTexto) {
      if (partes.includes('Cintas'))      base.extraCintas      = true
      if (partes.includes('Plantillas'))  base.extraPlantillas  = true
      if (partes.includes('Desodorante')) base.extraDesodorante = true
      base.extras = ''
    } else {
      base.extras = extrasTexto
    }
  }

  return base
}

function FormItem({ item, idx, onChange, onQuitar, puedeQuitar }) {
  const esTenis        = item.tipoItem === 'tenis'
  const esAccesorio    = item.tipoItem === 'accesorio'
  const esRestauracion = esTenis && item.servicio === 'Restauración'

  const campo = (key, label, opts = {}) => (
    <div>
      <label className="text-xs text-gray-500 mb-1 block">{label}</label>
      {opts.opciones ? (
        <select
          value={item[key]}
          onChange={e => onChange(idx, key, e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-gray-400"
        >
          <option value="">Seleccionar...</option>
          {opts.opciones.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type={opts.type || 'text'}
          value={item[key]}
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
                      checked={item.pegadoSuela}
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
                        checked={item[e.id]}
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
                    checked={item[p.id]}
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

export default function OrdenEditar() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [cargando, setCargando]   = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError]         = useState('')
  const [orden, setOrden]         = useState(null)

  const [form, setForm] = useState({
    fechaEntrega: '', formaPago: 'efectivo', anticipo: '', urlFotos: '', notas: '',
  })
  const [items, setItems] = useState([])

  useEffect(() => {
    obtenerOrden(parseInt(id))
      .then(({ data }) => {
        setOrden(data)
        setForm({
          fechaEntrega: data.fechaEntrega ? String(data.fechaEntrega).slice(0, 10) : '',
          formaPago:    data.formaPago || 'efectivo',
          anticipo:     String(data.anticipo || ''),
          urlFotos:     data.urlFotos || '',
          notas:        data.notas || '',
        })
        setItems(data.items?.map(itemDesdeAPI) || [itemVacio('tenis')])
      })
      .catch(() => navigate('/ordenes'))
      .finally(() => setCargando(false))
  }, [id])

  const agregarItem = (tipo) => {
    if (items.length < 12) setItems([...items, itemVacio(tipo)])
  }

  const quitarItem = (idx) => setItems(items.filter((_, i) => i !== idx))

  const actualizarItem = (idx, campo, valor) => {
    const nuevos = [...items]
    if (campo === 'tipoItem') {
      nuevos[idx] = itemVacio(valor)
    } else if (campo === 'servicio') {
      const precio = PRECIO_SERVICIO[valor]
      nuevos[idx] = {
        ...nuevos[idx],
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
    } else if (campo === 'restauracionBase') {
      const updated = { ...nuevos[idx], restauracionBase: valor }
      nuevos[idx] = { ...updated, precio: String(calcularPrecioRestauracion(updated)) }
    } else if (campo === 'pegadoSuela' || EXTRAS_RESTAURACION.some(e => e.id === campo)) {
      const updated = { ...nuevos[idx], [campo]: valor }
      const total = calcularPrecioRestauracion(updated)
      nuevos[idx] = { ...updated, precio: total > 0 ? String(total) : '' }
    } else if (PRODUCTOS_EXTRA.some(p => p.id === campo)) {
      const updated = { ...nuevos[idx], [campo]: valor }
      if (updated.servicio === 'Restauración') {
        const total = calcularPrecioRestauracion(updated)
        nuevos[idx] = { ...updated, precio: total > 0 ? String(total) : '' }
      } else {
        const extra = PRODUCTOS_EXTRA.find(p => p.id === campo)
        const base = parseFloat(nuevos[idx].precio || 0)
        const newTotal = valor ? base + extra.precio : base - extra.precio
        nuevos[idx] = { ...updated, precio: newTotal > 0 ? String(newTotal) : '' }
      }
    } else {
      nuevos[idx] = { ...nuevos[idx], [campo]: valor }
    }
    setItems(nuevos)
  }

  const total = items.reduce((s, i) => s + parseFloat(i.precio || 0), 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (items.length === 0) { setError('Agrega al menos un artículo'); return }

    const itemsParaEnviar = items.map(item => {
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
    })

    setGuardando(true)
    try {
      await actualizarOrden(parseInt(id), {
        ...form,
        anticipo: parseFloat(form.anticipo || 0),
        items: itemsParaEnviar,
      })
      navigate(`/ordenes/${id}`)
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al guardar los cambios')
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) {
    return <Layout><div className="flex items-center justify-center h-64 text-gray-400">Cargando...</div></Layout>
  }

  if (!orden) return null

  const conteoTenis     = items.filter(i => i.tipoItem === 'tenis').length
  const conteoAccesorio = items.filter(i => i.tipoItem === 'accesorio').length

  return (
    <Layout>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(`/ordenes/${id}`)} className="text-gray-400 hover:text-gray-600 text-lg">←</button>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900">Editar Orden</h2>
          <span className="px-3 py-1 rounded-full text-sm font-bold tracking-wide"
            style={{ backgroundColor: '#EEEEFF', color: '#3B30D0' }}>
            #{orden.numeroOrden}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">

        {/* Cliente (solo lectura) */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-2">Cliente</h3>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-lg border border-gray-200 px-3 py-2 bg-gray-50 text-sm text-gray-700">
              {orden.cliente?.nombre}
              {orden.cliente?.telefono && (
                <span className="text-gray-400 ml-2 text-xs">{orden.cliente.telefono}</span>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">El cliente no se puede cambiar en edición</p>
        </div>

        {/* Fecha de entrega */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Fecha estimada de entrega</h3>
          <div className="max-w-xs">
            <input type="date" value={form.fechaEntrega}
              onChange={e => setForm({ ...form, fechaEntrega: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>

        {/* Artículos */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900">Artículos ({items.length}/12)</h3>
            {(conteoTenis > 0 || conteoAccesorio > 0) && (
              <p className="text-xs text-gray-400 mt-0.5">
                {conteoTenis > 0 && `${conteoTenis} par(es) de zapatos`}
                {conteoTenis > 0 && conteoAccesorio > 0 && ' · '}
                {conteoAccesorio > 0 && `${conteoAccesorio} accesorio(s)`}
              </p>
            )}
          </div>

          <div className="space-y-4">
            {items.map((item, idx) => (
              <div key={idx}>
                <FormItem
                  item={item}
                  idx={idx}
                  onChange={actualizarItem}
                  onQuitar={quitarItem}
                  puedeQuitar={items.length > 1}
                />
                {items.length < 12 && idx === items.length - 1 && (
                  <button
                    type="button"
                    onClick={() => agregarItem('tenis')}
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
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
            <div className="text-right">
              <p className="text-xs text-gray-500">Total estimado</p>
              <p className="text-2xl font-bold text-gray-900">{formatearMoneda(total)}</p>
            </div>
          </div>
        </div>

        {/* Pago y recepción */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Pago y recepción</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Forma de pago</label>
              <select value={form.formaPago} onChange={e => setForm({ ...form, formaPago: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white">
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta de crédito</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Anticipo / Pago Total (Q)</label>
              <input type="number" min="0" step="0.01" value={form.anticipo}
                onChange={e => setForm({ ...form, anticipo: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="0.00" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL de fotografías de recepción
              </label>
              <input type="url" value={form.urlFotos}
                onChange={e => setForm({ ...form, urlFotos: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="https://photos.google.com/album/..." />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })}
                rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none"
                placeholder="Indicaciones especiales..." />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
        )}

        <div className="flex gap-3 pb-8">
          <button type="button" onClick={() => navigate(`/ordenes/${id}`)}
            className="px-6 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit" disabled={guardando}
            className="flex-1 text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-60 transition-colors"
            style={{ backgroundColor: guardando ? '#7B73E0' : '#3B30D0' }}>
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </Layout>
  )
}
