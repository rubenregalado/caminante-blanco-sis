import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { listarOrdenes } from '../api/ordenes'
import Layout from '../components/Layout'
import OrdenCard from '../components/OrdenCard'
import EstadoBadge from '../components/EstadoBadge'
import { formatearFecha, formatearMoneda } from '../utils/formatters'

const ESTADOS = ['', 'pendiente', 'en_proceso', 'listo', 'entregado']
const ETIQUETAS = {
  '': 'Todas',
  pendiente: 'Pendientes',
  en_proceso: 'En proceso',
  listo: 'Listas',
  entregado: 'Entregadas',
}

export default function Ordenes() {
  const [ordenes, setOrdenes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [buscar, setBuscar] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const vista = searchParams.get('vista') || 'seguimiento'
  const estadoFiltro = searchParams.get('estado') || ''

  // Historial filters
  const [hBuscar, setHBuscar] = useState('')
  const [hDesde, setHDesde] = useState('')
  const [hHasta, setHHasta] = useState('')
  const [hEstado, setHEstado] = useState('')

  const cargarSeguimiento = useCallback(() => {
    setCargando(true)
    const params = {}
    if (estadoFiltro) params.estado = estadoFiltro
    if (buscar)       params.buscar = buscar
    listarOrdenes(params)
      .then(({ data }) => setOrdenes(data))
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [estadoFiltro, buscar])

  const cargarHistorial = useCallback((overrides = {}) => {
    setCargando(true)
    const params = {}
    const b = overrides.buscar  !== undefined ? overrides.buscar  : hBuscar
    const d = overrides.desde   !== undefined ? overrides.desde   : hDesde
    const h = overrides.hasta   !== undefined ? overrides.hasta   : hHasta
    const e = overrides.estado  !== undefined ? overrides.estado  : hEstado
    if (b) params.buscar     = b
    if (d) params.fechaDesde = d
    if (h) params.fechaHasta = h
    if (e) params.estado     = e
    listarOrdenes(params)
      .then(({ data }) => setOrdenes(data))
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [hBuscar, hDesde, hHasta, hEstado])

  useEffect(() => {
    if (vista === 'seguimiento') cargarSeguimiento()
    else cargarHistorial()
  }, [vista, estadoFiltro])

  const cambiarVista = (v) => {
    setOrdenes([])
    setSearchParams(v === 'historial' ? { vista: 'historial' } : {})
  }

  // ── Seguimiento handlers ──
  const handleBuscarSeguimiento = (e) => {
    e.preventDefault()
    cargarSeguimiento()
  }

  // ── Historial handlers ──
  const handleBuscarHistorial = (e) => {
    e.preventDefault()
    cargarHistorial()
  }

  const limpiarHistorial = () => {
    setHBuscar('')
    setHDesde('')
    setHHasta('')
    setHEstado('')
    cargarHistorial({ buscar: '', desde: '', hasta: '', estado: '' })
  }

  const hayFiltrosHistorial = hBuscar || hDesde || hHasta || hEstado

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-bold text-gray-900">Órdenes</h2>
        <button
          onClick={() => navigate('/ordenes/nueva')}
          className="text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ backgroundColor: '#3B30D0' }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#2D24A8' }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#3B30D0' }}
        >
          + Nueva Orden
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl p-1 mb-5 w-fit" style={{ backgroundColor: '#F3F4F6' }}>
        {[
          { key: 'seguimiento', label: 'Seguimiento' },
          { key: 'historial',   label: 'Historial' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => cambiarVista(t.key)}
            className="px-5 py-2 rounded-lg text-sm font-semibold transition-all"
            style={vista === t.key
              ? { backgroundColor: 'white', color: '#3B30D0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
              : { color: '#6B7280' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════ VISTA SEGUIMIENTO ══════════════ */}
      {vista === 'seguimiento' && (
        <>
          {/* Filtro de estado */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {ESTADOS.map(estado => (
              <button
                key={estado}
                onClick={() => setSearchParams(estado ? { estado } : {})}
                className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors border"
                style={estadoFiltro === estado
                  ? { backgroundColor: '#3B30D0', color: 'white', borderColor: '#3B30D0' }
                  : { backgroundColor: 'white', color: '#6B7280', borderColor: '#D1D5DB' }}
              >
                {ETIQUETAS[estado]}
              </button>
            ))}
          </div>

          {/* Búsqueda */}
          <form onSubmit={handleBuscarSeguimiento} className="flex gap-2 mb-6">
            <input
              type="text"
              value={buscar}
              onChange={e => setBuscar(e.target.value)}
              placeholder="Buscar por número de orden o nombre de cliente..."
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
            />
            <button
              type="submit"
              className="text-white px-4 py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: '#3B30D0' }}
            >
              Buscar
            </button>
            {buscar && (
              <button
                type="button"
                onClick={() => { setBuscar(''); cargarSeguimiento() }}
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
        </>
      )}

      {/* ══════════════ VISTA HISTORIAL ══════════════ */}
      {vista === 'historial' && (
        <>
          {/* Panel de filtros */}
          <form onSubmit={handleBuscarHistorial} className="bg-white rounded-2xl border border-gray-200 p-4 mb-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              {/* Búsqueda texto */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Orden o cliente</label>
                <input
                  type="text"
                  value={hBuscar}
                  onChange={e => setHBuscar(e.target.value)}
                  placeholder="Número de orden o nombre..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                />
              </div>

              {/* Fecha desde */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Desde</label>
                <input
                  type="date"
                  value={hDesde}
                  onChange={e => setHDesde(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                />
              </div>

              {/* Fecha hasta */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Hasta</label>
                <input
                  type="date"
                  value={hHasta}
                  onChange={e => setHHasta(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            {/* Filtro estado */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex gap-2 flex-wrap">
                {ESTADOS.map(estado => (
                  <button
                    key={estado}
                    type="button"
                    onClick={() => setHEstado(e => e === estado ? '' : estado)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors border"
                    style={hEstado === estado && estado !== ''
                      ? { backgroundColor: '#3B30D0', color: 'white', borderColor: '#3B30D0' }
                      : hEstado === '' && estado === ''
                      ? { backgroundColor: '#3B30D0', color: 'white', borderColor: '#3B30D0' }
                      : { backgroundColor: 'white', color: '#6B7280', borderColor: '#D1D5DB' }}
                  >
                    {ETIQUETAS[estado]}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 shrink-0">
                {hayFiltrosHistorial && (
                  <button
                    type="button"
                    onClick={limpiarHistorial}
                    className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Limpiar
                  </button>
                )}
                <button
                  type="submit"
                  className="text-white px-5 py-2 rounded-lg text-sm font-semibold"
                  style={{ backgroundColor: '#3B30D0' }}
                >
                  Buscar
                </button>
              </div>
            </div>
          </form>

          {/* Resultados */}
          {cargando ? (
            <div className="text-center text-gray-400 py-12">Cargando...</div>
          ) : ordenes.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
              <p className="text-gray-400 text-base">Sin resultados</p>
              <p className="text-gray-300 text-sm mt-1">Ajusta los filtros y vuelve a buscar</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-3">{ordenes.length} orden{ordenes.length !== 1 ? 'es' : ''} encontrada{ordenes.length !== 1 ? 's' : ''}</p>
              {/* Tabla */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {/* Cabecera — solo escritorio */}
                <div className="hidden lg:grid grid-cols-[1fr_1.4fr_0.9fr_0.9fr_0.9fr_0.85fr_0.75fr_0.75fr] gap-3 px-4 py-3 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  <span># Orden</span>
                  <span>Cliente</span>
                  <span>Ingreso</span>
                  <span>Est.</span>
                  <span>Real</span>
                  <span>Estado</span>
                  <span className="text-right">Total</span>
                  <span className="text-right">Saldo</span>
                </div>

                {ordenes.map((orden) => {
                  const saldo = parseFloat(orden.total) - parseFloat(orden.anticipo)
                  const fechaReal = orden.fechaEntregado
                  const esExpress = orden.items?.some(i => i.servicio?.toLowerCase().startsWith('limpieza express'))

                  return (
                    <div
                      key={orden.id}
                      onClick={() => navigate(`/ordenes/${orden.id}`)}
                      className="cursor-pointer transition-colors hover:bg-indigo-50 border-b border-gray-100 last:border-0"
                    >
                      {/* Vista escritorio */}
                      <div className="hidden lg:grid grid-cols-[1fr_1.4fr_0.9fr_0.9fr_0.9fr_0.85fr_0.75fr_0.75fr] gap-3 px-4 py-3 items-center">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-gray-900">#{orden.numeroOrden}</span>
                          {esExpress && <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>⚡</span>}
                        </div>
                        <span className="text-sm text-gray-700 truncate">{orden.cliente?.nombre}</span>
                        <span className="text-sm text-gray-500">{formatearFecha(orden.fechaIngreso)}</span>
                        <span className="text-sm text-gray-500">
                          {orden.fechaEntrega ? formatearFecha(orden.fechaEntrega) : <span className="text-gray-300">—</span>}
                        </span>
                        <span className="text-sm">
                          {fechaReal
                            ? <span className="font-semibold text-green-700">{formatearFecha(fechaReal)}</span>
                            : <span className="text-gray-300">—</span>}
                        </span>
                        <EstadoBadge estado={orden.estado} />
                        <span className="text-sm font-semibold text-gray-900 text-right">{formatearMoneda(orden.total)}</span>
                        <span className={`text-sm font-semibold text-right ${saldo > 0 ? 'text-orange-500' : 'text-green-600'}`}>
                          {saldo > 0 ? formatearMoneda(saldo) : '—'}
                        </span>
                      </div>

                      {/* Vista móvil */}
                      <div className="lg:hidden px-4 py-3 flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-bold text-sm text-gray-900">#{orden.numeroOrden}</span>
                            {esExpress && <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>⚡</span>}
                            <EstadoBadge estado={orden.estado} />
                          </div>
                          <p className="text-sm text-gray-600 truncate">{orden.cliente?.nombre}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-400">
                            <span>Ingreso: {formatearFecha(orden.fechaIngreso)}</span>
                            {orden.fechaEntrega && (
                              <span>Est: {formatearFecha(orden.fechaEntrega)}</span>
                            )}
                            {fechaReal && (
                              <span className="font-semibold text-green-700">Real: {formatearFecha(fechaReal)}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-gray-900">{formatearMoneda(orden.total)}</p>
                          {saldo > 0 && <p className="text-xs text-orange-500">Saldo: {formatearMoneda(saldo)}</p>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}
    </Layout>
  )
}
