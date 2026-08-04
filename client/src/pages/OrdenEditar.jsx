import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { obtenerOrden, actualizarOrden } from '../api/ordenes'
import Layout from '../components/Layout'
import ItemOrdenForm, {
  BotonAgregarItem,
  MAX_ITEMS,
  aplicarCambioItem,
  itemDesdeAPI,
  itemVacio,
  serializarItemParaAPI,
} from '../components/ItemOrdenForm'
import { formatearMoneda } from '../utils/formatters'

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
    if (items.length < MAX_ITEMS) setItems([...items, itemVacio(tipo)])
  }

  const quitarItem = (idx) => setItems(items.filter((_, i) => i !== idx))

  const actualizarItem = (idx, campo, valor) => {
    setItems(items.map((item, i) => (i === idx ? aplicarCambioItem(item, campo, valor) : item)))
  }

  const total = items.reduce((s, i) => s + parseFloat(i.precio || 0), 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (items.length === 0) { setError('Agrega al menos un artículo'); return }

    const itemsParaEnviar = items.map(serializarItemParaAPI)

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
