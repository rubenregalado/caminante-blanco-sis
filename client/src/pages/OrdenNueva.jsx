import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { crearOrden, siguienteNumeroOrden } from '../api/ordenes'
import { listarClientes, crearCliente } from '../api/clientes'
import Layout from '../components/Layout'
import ItemOrdenForm, {
  BotonAgregarItem,
  MAX_ITEMS,
  aplicarCambioItem,
  itemVacio,
  serializarItemParaAPI,
} from '../components/ItemOrdenForm'
import { formatearMoneda } from '../utils/formatters'

const PROMOCIONES = [
  {
    id: 'segundo_mitad',
    label: 'Segundo a Mitad de Precio',
    desc: 'El artículo más barato de cada par va al 50%.',
    minItems: 2,
  },
  {
    id: 'dos_x_uno',
    label: '2×1 — Lleva 2, paga 1',
    desc: 'Por cada 2 artículos, el más barato es gratis.',
    minItems: 2,
  },
  {
    id: 'tres_x_dos',
    label: '3×2 — Lleva 3, paga 2',
    desc: 'Por cada 3 artículos, el más barato es gratis.',
    minItems: 3,
  },
]

function calcularPromocion(items, promo) {
  if (!promo) return { descuento: 0, lineas: [], mapaDescuentos: new Map() }

  const conPrecio = items
    .map((item, i) => ({
      i,
      precio: parseFloat(item.precio || 0),
      nombre: item.servicio || (item.tipoItem === 'accesorio' ? 'Accesorio' : 'Calzado'),
    }))
    .filter(x => x.precio > 0)
    .sort((a, b) => b.precio - a.precio) // mayor a menor

  const N = conPrecio.length

  let nDesc = 0
  let factor = 0

  if (promo === 'segundo_mitad') {
    if (N < 2) return { descuento: 0, lineas: [], mapaDescuentos: new Map() }
    nDesc = Math.floor(N / 2)
    factor = 0.5
  } else if (promo === 'dos_x_uno') {
    if (N < 2) return { descuento: 0, lineas: [], mapaDescuentos: new Map() }
    nDesc = Math.floor(N / 2)
    factor = 0
  } else if (promo === 'tres_x_dos') {
    if (N < 3) return { descuento: 0, lineas: [], mapaDescuentos: new Map() }
    nDesc = Math.floor(N / 3)
    factor = 0
  }

  if (nDesc === 0) return { descuento: 0, lineas: [], mapaDescuentos: new Map() }

  // Los nDesc más baratos (al final del array ordenado desc) reciben el descuento
  const afectados = conPrecio.slice(N - nDesc)
  const mapaDescuentos = new Map(afectados.map(x => [x.i, factor]))

  const lineas = afectados.map(x => {
    const ahorro = x.precio * (1 - factor)
    const etiqueta = factor === 0 ? 'GRATIS' : '50% off'
    return `${x.nombre} (Q${x.precio.toFixed(2)}) → ${etiqueta}: -Q${ahorro.toFixed(2)}`
  })

  const descuento = afectados.reduce((s, x) => s + x.precio * (1 - factor), 0)
  return { descuento, lineas, mapaDescuentos }
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
  const [numeroPreview, setNumeroPreview] = useState('')

  const _hd = new Date()
  const hoy = `${_hd.getFullYear()}-${String(_hd.getMonth()+1).padStart(2,'0')}-${String(_hd.getDate()).padStart(2,'0')}`
  const [form, setForm] = useState({ fechaIngreso: hoy, fechaEntrega: '', formaPago: 'efectivo', anticipo: '', urlFotos: '', notas: '', promocion: '' })
  const [items, setItems] = useState([itemVacio('tenis')])

  useEffect(() => {
    siguienteNumeroOrden().then(({ data }) => setNumeroPreview(data.numeroOrden)).catch(() => {})
  }, [])

  useEffect(() => {
    listarClientes(buscarCliente).then(({ data }) => setClientes(data))
  }, [buscarCliente])

  const agregarItem = (tipo) => {
    if (items.length < MAX_ITEMS) setItems([...items, itemVacio(tipo)])
  }

  const quitarItem = (idx) => setItems(items.filter((_, i) => i !== idx))

  const actualizarItem = (idx, campo, valor) => {
    setItems(items.map((item, i) => (i === idx ? aplicarCambioItem(item, campo, valor) : item)))
  }

  const total = items.reduce((s, i) => s + parseFloat(i.precio || 0), 0)
  const promoCalc = calcularPromocion(items, form.promocion)
  const totalFinal = Math.max(0, total - promoCalc.descuento)
  const nItemsConPrecio = items.filter(i => parseFloat(i.precio || 0) > 0).length

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

    const itemsParaEnviar = items.map(serializarItemParaAPI)

    // Aplicar descuentos de promoción a los precios de los items
    let itemsFinales = itemsParaEnviar
    if (promoCalc.mapaDescuentos.size > 0) {
      itemsFinales = itemsParaEnviar.map((item, i) => {
        if (promoCalc.mapaDescuentos.has(i)) {
          const factor = promoCalc.mapaDescuentos.get(i)
          return { ...item, precio: (parseFloat(item.precio || 0) * factor).toFixed(2) }
        }
        return item
      })
    }

    const { promocion: _, ...formDatos } = form
    setCargando(true)
    try {
      const { data } = await crearOrden({
        ...formDatos,
        clienteId: parseInt(clienteId),
        anticipo:  parseFloat(form.anticipo || 0),
        items: itemsFinales,
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
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900">Nueva Orden</h2>
          {numeroPreview && (
            <span className="px-3 py-1 rounded-full text-sm font-bold tracking-wide"
              style={{ backgroundColor: '#EEEEFF', color: '#3B30D0' }}>
              #{numeroPreview}
            </span>
          )}
        </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

        {/* Fechas */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Fechas de servicio</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </div>
        </div>

        {/* Artículos */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900">Artículos ({items.length}/{MAX_ITEMS})</h3>
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
                <ItemOrdenForm
                  item={item}
                  idx={idx}
                  onChange={actualizarItem}
                  onQuitar={quitarItem}
                  puedeQuitar={items.length > 1}
                />
                {items.length < MAX_ITEMS && idx === items.length - 1 && (
                  <BotonAgregarItem onClick={() => agregarItem('tenis')} />
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
            <div className="text-right space-y-0.5">
              {promoCalc.descuento > 0 && (
                <>
                  <p className="text-sm text-gray-400">Subtotal: {formatearMoneda(total)}</p>
                  <p className="text-sm font-medium text-green-600">
                    {PROMOCIONES.find(p => p.id === form.promocion)?.label}: -{formatearMoneda(promoCalc.descuento)}
                  </p>
                </>
              )}
              <p className="text-xs text-gray-500">{promoCalc.descuento > 0 ? 'Total con descuento' : 'Total estimado'}</p>
              <p className="text-2xl font-bold text-gray-900">{formatearMoneda(totalFinal)}</p>
            </div>
          </div>
        </div>

        {/* Pago y recepción */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Pago y recepción</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Promociones */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Promoción</label>
              <select
                value={form.promocion}
                onChange={e => {
                  const promo = e.target.value
                  setForm(prev => ({
                    ...prev,
                    promocion: promo,
                    formaPago: promo && prev.formaPago === 'tarjeta' ? 'efectivo' : prev.formaPago,
                  }))
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              >
                <option value="">Sin promoción</option>
                {PROMOCIONES.map(p => (
                  <option key={p.id} value={p.id} disabled={nItemsConPrecio < p.minItems}>
                    {p.label}{nItemsConPrecio < p.minItems ? ` (mínimo ${p.minItems} artículos)` : ''}
                  </option>
                ))}
              </select>
              {form.promocion && promoCalc.descuento > 0 && (
                <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-semibold text-green-700 mb-1">
                    {PROMOCIONES.find(p => p.id === form.promocion)?.desc}
                  </p>
                  {promoCalc.lineas.map((linea, i) => (
                    <p key={i} className="text-xs text-green-600 flex items-start gap-1">
                      <span className="text-green-500 mt-px">✓</span> {linea}
                    </p>
                  ))}
                  <p className="text-xs font-bold text-green-700 pt-1 border-t border-green-200 mt-1">
                    Ahorro total: -{formatearMoneda(promoCalc.descuento)}
                  </p>
                </div>
              )}
              {form.promocion && promoCalc.descuento === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  Agrega al menos {PROMOCIONES.find(p => p.id === form.promocion)?.minItems} artículos con precio para aplicar esta promoción.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Forma de pago</label>
              <select value={form.formaPago} onChange={e => setForm({ ...form, formaPago: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white">
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta" disabled={!!form.promocion}>
                  Tarjeta de crédito{form.promocion ? ' (no disponible con promociones)' : ''}
                </option>
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
              <input
                type="url"
                value={form.urlFotos}
                onChange={e => setForm({ ...form, urlFotos: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="https://photos.google.com/album/..." />
              <p className="text-xs text-gray-400 mt-1">Álbum de Google Photos con las fotos del estado al momento de recepción</p>
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
