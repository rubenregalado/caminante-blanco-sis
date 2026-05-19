import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listarClientes, crearCliente } from '../api/clientes'
import Layout from '../components/Layout'

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [buscar, setBuscar] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState({ nombre: '', telefono: '', nit: '', correo: '', genero: '', fechaNacimiento: '', direccion: '' })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const cargar = (termino = '') => {
    setCargando(true)
    listarClientes(termino)
      .then(({ data }) => setClientes(data))
      .catch(console.error)
      .finally(() => setCargando(false))
  }

  useEffect(() => { cargar() }, [])

  const handleBuscar = (e) => {
    e.preventDefault()
    cargar(buscar)
  }

  const handleCrear = async (e) => {
    e.preventDefault()
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return }
    setGuardando(true)
    setError('')
    try {
      await crearCliente({ ...form, nit: form.nit || 'CF' })
      setForm({ nombre: '', telefono: '', nit: '', correo: '', genero: '', fechaNacimiento: '', direccion: '' })
      setMostrarForm(false)
      cargar()
    } catch {
      setError('Error al crear el cliente')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Clientes</h2>
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium"
          style={{ backgroundColor: '#3B30D0' }}
        >
          + Nuevo Cliente
        </button>
      </div>

      {mostrarForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Nuevo cliente</h3>
          <form onSubmit={handleCrear} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              ['nombre', 'Nombre *', 'text'],
              ['telefono', 'Teléfono', 'text'],
              ['nit', 'NIT (CF si no tiene)', 'text'],
              ['correo', 'Correo electrónico', 'email'],
            ].map(([campo, label, tipo]) => (
              <div key={campo}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input
                  type={tipo}
                  value={form[campo]}
                  onChange={(e) => setForm({ ...form, [campo]: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Género</label>
              <select
                value={form.genero}
                onChange={(e) => setForm({ ...form, genero: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              >
                <option value="">Sin especificar</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de nacimiento</label>
              <input
                type="date"
                value={form.fechaNacimiento}
                onChange={(e) => setForm({ ...form, fechaNacimiento: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <input
                type="text"
                value={form.direccion}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            {error && <p className="sm:col-span-2 text-red-600 text-sm">{error}</p>}
            <div className="sm:col-span-2 flex gap-3">
              <button
                type="button"
                onClick={() => { setMostrarForm(false); setError('') }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-60"
                style={{ backgroundColor: '#3B30D0' }}
              >
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      <form onSubmit={handleBuscar} className="flex gap-2 mb-6">
        <input
          type="text"
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          placeholder="Buscar por nombre, teléfono o NIT..."
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none"
        />
        <button type="submit" className="bg-gray-800 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium">
          Buscar
        </button>
        {buscar && (
          <button type="button" onClick={() => { setBuscar(''); cargar() }} className="px-3 py-2 rounded-lg border border-gray-300 text-sm">✕</button>
        )}
      </form>

      {cargando ? (
        <div className="text-center text-gray-400 py-12">Cargando...</div>
      ) : clientes.length === 0 ? (
        <div className="text-center text-gray-400 py-12">Sin clientes registrados</div>
      ) : (
        <>
          {/* Tabla — visible en sm+ */}
          <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Nombre</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Teléfono</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Correo</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">NIT</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Órdenes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clientes.map(cliente => (
                  <tr
                    key={cliente.id}
                    onClick={() => navigate(`/clientes/${cliente.id}`)}
                    className="hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{cliente.nombre}</td>
                    <td className="px-4 py-3 text-gray-600">{cliente.telefono || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{cliente.correo || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{cliente.nit || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{cliente._count?.ordenes || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tarjetas — visible solo en móvil */}
          <div className="sm:hidden space-y-2">
            {clientes.map(cliente => (
              <div
                key={cliente.id}
                onClick={() => navigate(`/clientes/${cliente.id}`)}
                className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer active:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-900">{cliente.nombre}</p>
                  <span className="text-xs text-gray-400">{cliente._count?.ordenes || 0} órdenes</span>
                </div>
                {cliente.telefono && <p className="text-sm text-gray-500 mt-1">{cliente.telefono}</p>}
                {cliente.correo && <p className="text-sm text-gray-500">{cliente.correo}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </Layout>
  )
}
