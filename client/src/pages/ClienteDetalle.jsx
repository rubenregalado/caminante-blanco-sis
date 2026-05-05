import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { obtenerCliente, obtenerOrdenesCliente, actualizarCliente } from '../api/clientes'
import Layout from '../components/Layout'
import OrdenCard from '../components/OrdenCard'
import { formatearFecha } from '../utils/formatters'

export default function ClienteDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [cliente, setCliente] = useState(null)
  const [ordenes, setOrdenes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState({})
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    Promise.all([
      obtenerCliente(parseInt(id)),
      obtenerOrdenesCliente(parseInt(id))
    ])
      .then(([{ data: c }, { data: o }]) => {
        setCliente(c)
        setForm(c)
        setOrdenes(o)
      })
      .catch(() => navigate('/clientes'))
      .finally(() => setCargando(false))
  }, [id])

  const handleGuardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    try {
      const { data } = await actualizarCliente(parseInt(id), form)
      setCliente(data)
      setEditando(false)
    } catch {
      console.error('Error al actualizar')
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) {
    return <Layout><div className="flex items-center justify-center h-64 text-gray-400">Cargando...</div></Layout>
  }

  if (!cliente) return null

  return (
    <Layout>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/clientes')} className="text-gray-400 hover:text-gray-600">←</button>
        <h2 className="text-2xl font-bold text-gray-900">{cliente.nombre}</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Datos del cliente</h3>
              <button
                onClick={() => setEditando(!editando)}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                {editando ? 'Cancelar' : 'Editar'}
              </button>
            </div>

            {editando ? (
              <form onSubmit={handleGuardar} className="space-y-3">
                {[
                  ['nombre', 'Nombre'],
                  ['telefono', 'Teléfono'],
                  ['nit', 'NIT'],
                  ['correo', 'Correo'],
                  ['direccion', 'Dirección']
                ].map(([campo, label]) => (
                  <div key={campo}>
                    <label className="text-xs text-gray-500">{label}</label>
                    <input
                      type="text"
                      value={form[campo] || ''}
                      onChange={(e) => setForm({ ...form, [campo]: e.target.value })}
                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm mt-1"
                    />
                  </div>
                ))}
                <button
                  type="submit"
                  disabled={guardando}
                  className="w-full bg-blue-600 text-white rounded py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
                >
                  {guardando ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </form>
            ) : (
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400">Teléfono</p>
                  <p className="text-gray-800">{cliente.telefono || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Correo</p>
                  <p className="text-gray-800">{cliente.correo || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">NIT</p>
                  <p className="text-gray-800">{cliente.nit || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Dirección</p>
                  <p className="text-gray-800">{cliente.direccion || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Cliente desde</p>
                  <p className="text-gray-800">{formatearFecha(cliente.createdAt)}</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 bg-blue-50 rounded-xl border border-blue-200 p-4 text-center">
            <p className="text-3xl font-bold text-blue-700">{ordenes.length}</p>
            <p className="text-sm text-blue-600 mt-0.5">órdenes en total</p>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Historial de órdenes</h3>
            <button
              onClick={() => navigate('/ordenes/nueva')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              + Nueva orden
            </button>
          </div>
          {ordenes.length === 0 ? (
            <p className="text-gray-400 text-sm">Sin órdenes registradas</p>
          ) : (
            <div className="space-y-3">
              {ordenes.map(orden => (
                <OrdenCard key={orden.id} orden={{ ...orden, cliente }} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
