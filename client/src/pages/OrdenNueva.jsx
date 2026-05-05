import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { crearOrden } from '../api/ordenes'
import { listarClientes, crearCliente } from '../api/clientes'
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

const TIPOS_TENIS     = ['Tennis', 'Botas', 'Casual de cuero', 'Crocs', 'Zapatillas', 'Otros']
const TIPOS_ACCESORIO = ['Gorra', 'Mochila', 'Cartera', 'Bolso', 'Cinturón', 'Otro']
const SERVICIOS_ACCESORIO = ['Limpieza básica', 'Limpieza profunda', 'Impermeabilización', 'Desinfección', 'Restauración', 'Otro']
const TAMANOS         = ['Único', 'XS', 'S', 'M', 'L', 'XL', 'XXL']

const itemVacio = (tipo = 'tenis') => ({
  tipoItem: tipo,
  servicio: '', color: '', extras: '', precio: '',
  tipoZapato: '', talla: '', marca: '',
  tipoAccesorio: '', tamano: '',
  restauracionBase: '',
  pegadoSuela: false,
})

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
              <IconShoe /> Tenis
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
                <div className="border-t border-gray-200 pt-2">
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
                </div>
              </div>
            </div>
          )}

          <div className="col-span-2 md:col-span-3">
            {campo('extras', 'Extras / Observaciones', { placeholder: 'Manchas especiales, decoloración...' })}
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

export default function OrdenNueva() {
  const navigate = useNavigate()
  const [cargando, setCargando]       = useState(false)
  const [error, setError]             = useState('')
  const [clientes, setClientes]       = useState([])
  const [buscarCliente, setBuscarCliente] = useState('')
  const [clienteId, setClienteId]     = useState('')
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false)
  const [nuevoCliente, setNuevoCliente] = useState({ nombre: '', telefono: '', nit: '', correo: '', genero: '', fechaNacimiento: '' })

  const hoy = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ fechaIngreso: hoy, fechaEntrega: '', formaPago: 'efectivo', anticipo: '', notas: '' })
  const [items, setItems] = useState([itemVacio('tenis')])

  useEffect(() => {
    listarClientes(buscarCliente).then(({ data }) => setClientes(data))
  }, [buscarCliente])

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
      }
    } else if (campo === 'restauracionBase') {
      const base = OPCIONES_RESTAURACION.find(o => o.id === valor)
      const total = (base ? base.precio : 0) + (nuevos[idx].pegadoSuela ? PEGADO_SUELA_PRECIO : 0)
      nuevos[idx] = { ...nuevos[idx], restauracionBase: valor, precio: String(total) }
    } else if (campo === 'pegadoSuela') {
      const base = OPCIONES_RESTAURACION.find(o => o.id === nuevos[idx].restauracionBase)
      const total = (base ? base.precio : 0) + (valor ? PEGADO_SUELA_PRECIO : 0)
      nuevos[idx] = { ...nuevos[idx], pegadoSuela: valor, precio: total > 0 ? String(total) : '' }
    } else {
      nuevos[idx] = { ...nuevos[idx], [campo]: valor }
    }
    setItems(nuevos)
  }

  const total = items.reduce((s, i) => s + parseFloat(i.precio || 0), 0)

  const handleGuardarCliente = async () => {
    if (!nuevoCliente.nombre.trim()) return
    try {
      const { data } = await crearCliente({ ...nuevoCliente, nit: nuevoCliente.nit || 'CF' })
      setClienteId(String(data.id))
      setBuscarCliente(data.nombre)
      setMostrarNuevoCliente(false)
      setNuevoCliente({ nombre: '', telefono: '', nit: '', correo: '', genero: '', fechaNacimiento: '' })
    } catch {
      setError('Error al crear el cliente')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!clienteId)         { setError('Selecciona un cliente'); return }
    if (items.length === 0) { setError('Agrega al menos un artículo'); return }

    const itemsParaEnviar = items.map(item => {
      if (item.servicio === 'Restauración') {
        const base = OPCIONES_RESTAURACION.find(o => o.id === item.restauracionBase)
        const partes = []
        if (base) partes.push(base.label)
        if (item.pegadoSuela) partes.push('Pegado de suela')
        const descripcion = partes.join(' + ')
        return {
          ...item,
          extras: descripcion
            ? (item.extras ? `${descripcion} · ${item.extras}` : descripcion)
            : item.extras,
        }
      }
      return item
    })

    setCargando(true)
    try {
      const { data } = await crearOrden({
        ...form,
        clienteId: parseInt(clienteId),
        anticipo:  parseFloat(form.anticipo || 0),
        items: itemsParaEnviar,
      })
      navigate(`/ordenes/${data.id}`)
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al crear la orden')
    } finally {
      setCargando(false)
    }
  }

  const conteoTenis     = items.filter(i => i.tipoItem === 'tenis').length
  const conteoAccesorio = items.filter(i => i.tipoItem === 'accesorio').length

  return (
    <Layout>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 text-lg">←</button>
        <h2 className="text-2xl font-bold text-gray-900">Nueva Orden</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">

        {/* Cliente */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Cliente</h3>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={buscarCliente}
                onChange={e => { setBuscarCliente(e.target.value); setClienteId('') }}
                placeholder="Buscar cliente por nombre..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
              />
              {buscarCliente && !clienteId && clientes.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {clientes.map(c => (
                    <button key={c.id} type="button"
                      onClick={() => { setClienteId(String(c.id)); setBuscarCliente(c.nombre) }}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                    >
                      <span className="font-medium">{c.nombre}</span>
                      {c.telefono && <span className="text-gray-400 ml-2 text-xs">{c.telefono}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button type="button" onClick={() => setMostrarNuevoCliente(!mostrarNuevoCliente)}
              className="px-3 py-2 rounded-lg border border-dashed text-sm font-medium transition-colors"
              style={{ borderColor: '#3B30D0', color: '#3B30D0' }}>
              + Nuevo
            </button>
          </div>

          {mostrarNuevoCliente && (
            <div className="mt-4 p-4 rounded-lg space-y-3" style={{ backgroundColor: '#F0EEFF' }}>
              <p className="text-sm font-semibold" style={{ color: '#3B30D0' }}>Nuevo cliente</p>
              <div className="grid grid-cols-2 gap-3">
                {[['nombre','Nombre *'],['telefono','Teléfono'],['nit','NIT'],['correo','Correo']].map(([c, l]) => (
                  <div key={c}>
                    <label className="text-xs text-gray-600">{l}</label>
                    <input type={c === 'correo' ? 'email' : 'text'} value={nuevoCliente[c]}
                      onChange={e => setNuevoCliente({ ...nuevoCliente, [c]: e.target.value })}
                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm mt-1" />
                  </div>
                ))}
                <div>
                  <label className="text-xs text-gray-600">Género</label>
                  <select value={nuevoCliente.genero}
                    onChange={e => setNuevoCliente({ ...nuevoCliente, genero: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm mt-1 bg-white">
                    <option value="">Sin especificar</option>
                    <option value="masculino">Masculino</option>
                    <option value="femenino">Femenino</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600">Fecha de nacimiento</label>
                  <input type="date" value={nuevoCliente.fechaNacimiento}
                    onChange={e => setNuevoCliente({ ...nuevoCliente, fechaNacimiento: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm mt-1" />
                </div>
              </div>
              <button type="button" onClick={handleGuardarCliente}
                className="text-white text-sm px-4 py-1.5 rounded-lg font-medium"
                style={{ backgroundColor: '#3B30D0' }}>
                Guardar cliente
              </button>
            </div>
          )}
          {clienteId && (
            <p className="text-sm mt-2" style={{ color: '#28B882' }}>✓ Cliente: {buscarCliente}</p>
          )}
        </div>

        {/* Datos de la orden */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Datos de la orden</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de ingreso *</label>
              <input type="date" value={form.fechaIngreso}
                onChange={e => setForm({ ...form, fechaIngreso: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha estimada de entrega</label>
              <input type="date" value={form.fechaEntrega}
                onChange={e => setForm({ ...form, fechaEntrega: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Forma de pago</label>
              <select value={form.formaPago} onChange={e => setForm({ ...form, formaPago: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta de crédito</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Anticipo (Q)</label>
              <input type="number" min="0" step="0.01" value={form.anticipo}
                onChange={e => setForm({ ...form, anticipo: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="0.00" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })}
                rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none"
                placeholder="Indicaciones especiales..." />
            </div>
          </div>
        </div>

        {/* Artículos */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">Artículos ({items.length}/12)</h3>
              {(conteoTenis > 0 || conteoAccesorio > 0) && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {conteoTenis > 0 && `${conteoTenis} par(es) de tenis`}
                  {conteoTenis > 0 && conteoAccesorio > 0 && ' · '}
                  {conteoAccesorio > 0 && `${conteoAccesorio} accesorio(s)`}
                </p>
              )}
            </div>
            {items.length < 12 && (
              <div className="flex gap-2">
                <button type="button" onClick={() => agregarItem('tenis')}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors"
                  style={{ borderColor: '#3B30D0', color: '#3B30D0' }}>
                  + Tenis
                </button>
                <button type="button" onClick={() => agregarItem('accesorio')}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors"
                  style={{ borderColor: '#28B882', color: '#28B882' }}>
                  + Accesorio
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {items.map((item, idx) => (
              <FormItem
                key={idx}
                item={item}
                idx={idx}
                onChange={actualizarItem}
                onQuitar={quitarItem}
                puedeQuitar={items.length > 1}
              />
            ))}
          </div>

          <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
            <div className="text-right">
              <p className="text-sm text-gray-500">Total estimado</p>
              <p className="text-2xl font-bold text-gray-900">{formatearMoneda(total)}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
        )}

        <div className="flex gap-3 pb-8">
          <button type="button" onClick={() => navigate(-1)}
            className="px-6 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit" disabled={cargando}
            className="flex-1 text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-60 transition-colors"
            style={{ backgroundColor: cargando ? '#7B73E0' : '#3B30D0' }}>
            {cargando ? 'Guardando...' : 'Crear Orden'}
          </button>
        </div>
      </form>
    </Layout>
  )
}
