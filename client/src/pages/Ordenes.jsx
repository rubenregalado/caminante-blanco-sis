import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { listarOrdenes } from '../api/ordenes'
import Layout from '../components/Layout'
import OrdenCard from '../components/OrdenCard'

const ESTADOS = ['', 'pendiente', 'en_proceso', 'listo', 'entregado']
const ETIQUETAS = {
  '': 'Todas',
  pendiente: 'Pendientes',
  en_proceso: 'En proceso',
  listo: 'Listas',
  entregado: 'Entregadas'
}

export default function Ordenes() {
  const [ordenes, setOrdenes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [buscar, setBuscar] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const estadoFiltro = searchParams.get('estado') || ''
  const navigate = useNavigate()

  const cargar = () => {
    setCargando(true)
    const params = {}
    if (estadoFiltro) params.estado = estadoFiltro
    if (buscar) params.buscar = buscar

    listarOrdenes(params)
      .then(({ data }) => setOrdenes(data))
      .catch(console.error)
      .finally(() => setCargando(false))
  }

  useEffect(() => { cargar() }, [estadoFiltro])

  const handleBuscar = (e) => {
    e.preventDefault()
    cargar()
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Órdenes</h2>
        <button
          onClick={() => navigate('/ordenes/nueva')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Nueva Orden
        </button>
      </div>

      {/* Filtro de estado */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {ESTADOS.map(estado => (
          <button
            key={estado}
            onClick={() => setSearchParams(estado ? { estado } : {})}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              estadoFiltro === estado
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {ETIQUETAS[estado]}
          </button>
        ))}
      </div>

      {/* Búsqueda */}
      <form onSubmit={handleBuscar} className="flex gap-2 mb-6">
        <input
          type="text"
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          placeholder="Buscar por número de orden o nombre de cliente..."
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-900"
        >
          Buscar
        </button>
        {buscar && (
          <button
            type="button"
            onClick={() => { setBuscar(''); cargar() }}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50"
          >
            ✕
          </button>
        )}
      </form>

      {cargando ? (
        <div className="text-center text-gray-400 py-12">Cargando...</div>
      ) : ordenes.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <p className="text-lg">Sin órdenes</p>
          <p className="text-sm mt-1">Crea la primera orden para comenzar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ordenes.map(orden => (
            <OrdenCard key={orden.id} orden={orden} />
          ))}
        </div>
      )}
    </Layout>
  )
}
