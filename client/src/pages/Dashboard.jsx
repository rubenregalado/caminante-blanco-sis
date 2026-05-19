import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { obtenerResumen, obtenerAnaliticas } from '../api/dashboard'
import Layout from '../components/Layout'
import OrdenCard from '../components/OrdenCard'
import { formatearMoneda, formatearFecha } from '../utils/formatters'
import EstadoBadge from '../components/EstadoBadge'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

const IconClock = ({ color }) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <polyline points="12 7 12 12 15.5 14.5"/>
  </svg>
)
const IconRefresh = ({ color }) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
)
const IconCheck = ({ color }) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
)
const IconBox = ({ color }) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
)

const tarjetas = [
  { key: 'pendiente',  label: 'Pendientes', Icono: IconClock,   iconColor: '#3B30D0', bg: '#FEFCE8', borde: '#FDE047', texto: '#854D0E', barra: '#FACC15' },
  { key: 'en_proceso', label: 'En proceso', Icono: IconRefresh, iconColor: '#ffffff', bg: '#3B30D0', borde: '#3B30D0', texto: '#ffffff', barra: '#ffffff' },
  { key: 'listo',      label: 'Listos',     Icono: IconCheck,   iconColor: '#3B30D0', bg: '#EDFBF5', borde: '#6EE7C0', texto: '#28B882', barra: '#3DDBA0' },
  { key: 'entregado',  label: 'Entregados', Icono: IconBox,     iconColor: '#3B30D0', bg: '#F9FAFB', borde: '#E5E7EB', texto: '#6B7280', barra: '#9CA3AF' },
]

const COLORES_GENERO = ['#3B30D0', '#3DDBA0', '#F59E0B', '#9CA3AF']
const ETIQUETAS_GENERO = {
  masculino: 'Masculino',
  femenino: 'Femenino',
  otro: 'Otro',
  no_especificado: 'Sin datos'
}

const TooltipMoneda = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-lg text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p style={{ color: '#3B30D0' }}>Ingreso: {formatearMoneda(payload[0]?.value || 0)}</p>
    </div>
  )
}


export default function Dashboard() {
  const { esAdmin } = useAuth()
  const [resumen, setResumen] = useState(null)
  const [analiticas, setAnaliticas] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [periodo, setPeriodo] = useState('dia')
  const [anio, setAnio] = useState(String(new Date().getFullYear()))
  const navigate = useNavigate()

  useEffect(() => {
    if (esAdmin) {
      Promise.all([obtenerResumen(), obtenerAnaliticas()])
        .then(([r, a]) => { setResumen(r.data); setAnaliticas(a.data) })
        .catch(console.error)
        .finally(() => setCargando(false))
    } else {
      obtenerResumen()
        .then(r => setResumen(r.data))
        .catch(console.error)
        .finally(() => setCargando(false))
    }
  }, [])

  const totalOrdenes = resumen ? Object.values(resumen.estados).reduce((s, v) => s + v, 0) : 0
  const ordenesActivas = resumen ? resumen.estados.pendiente + resumen.estados.en_proceso : 0

  const anosDisponibles = (() => {
    const set = new Set((analiticas?.ingresosPorMes || []).map(d => d.mes.slice(0, 4)))
    set.add(String(new Date().getFullYear()))
    return [...set].sort().reverse()
  })()

  const datosAnio = (() => {
    if (!analiticas) return []
    const MESES = ['01','02','03','04','05','06','07','08','09','10','11','12']
    const mapa = {}
    analiticas.ingresosPorMes
      .filter(d => d.mes.startsWith(anio))
      .forEach(d => { mapa[d.mes.slice(5)] = d })
    return MESES.map(m => ({
      x: new Date(`${anio}-${m}-02`).toLocaleDateString('es-GT', { month: 'short' }),
      ingreso: mapa[m]?.ingreso || 0,
      ordenes: mapa[m]?.ordenes || 0
    }))
  })()

  const datosGrafica = !analiticas ? [] :
    periodo === 'dia'
      ? analiticas.ingresosPorDia.map(d => ({
          x: d.fecha.slice(5).replace('-', '/'),
          ingreso: d.ingreso,
          ordenes: d.ordenes
        }))
      : periodo === 'semana'
      ? analiticas.ingresosPorSemana.map(d => ({
          x: `S${String(d.semana).slice(-2)}`,
          ingreso: d.ingreso,
          ordenes: d.ordenes
        }))
      : periodo === 'mes'
      ? analiticas.ingresosPorMes.map(d => ({
          x: new Date(d.mes + '-02').toLocaleDateString('es-GT', { month: 'short' }),
          ingreso: d.ingreso,
          ordenes: d.ordenes
        }))
      : datosAnio

  const ingresoTotal = datosGrafica.reduce((s, d) => s + d.ingreso, 0)
  const generoConDatos = analiticas?.distribucionGenero?.some(
    d => d.genero !== 'no_especificado' && d.cantidad > 0
  )

  if (cargando) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 text-gray-400">Cargando...</div>
      </Layout>
    )
  }

  return (
    <Layout>
      {/* ── Header ── */}
      <div
        className="rounded-2xl p-4 sm:p-6 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-lg"
        style={{ background: 'linear-gradient(135deg, #3B30D0 0%, #2D24A8 100%)' }}
      >
        <div className="flex items-center gap-3">
          <img src="/logo-white.png" alt="Caminante Blanco" className="h-10 sm:h-12" />
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">Dashboard</h2>
            <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {new Date().toLocaleDateString('es-GT', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
              })}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/ordenes/nueva')}
          className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow self-start sm:self-auto"
          style={{ backgroundColor: '#3DDBA0', color: '#2D24A8' }}
          onMouseEnter={e => { e.target.style.backgroundColor = '#28B882'; e.target.style.color = '#ffffff' }}
          onMouseLeave={e => { e.target.style.backgroundColor = '#3DDBA0'; e.target.style.color = '#2D24A8' }}
        >
          + Nueva Orden
        </button>
      </div>

      {/* ── Tarjetas de estado ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {tarjetas.map(({ key, label, Icono, iconColor, bg, borde, texto, barra }) => (
          <div
            key={key}
            onClick={() => navigate(`/ordenes?estado=${key}`)}
            className="rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md"
            style={{ backgroundColor: bg, border: `1px solid ${borde}` }}
          >
            <div className="flex items-center justify-between mb-3">
              <Icono color={iconColor} />
              <span className="text-3xl font-bold" style={{ color: texto }}>
                {resumen?.estados[key] || 0}
              </span>
            </div>
            <p className="text-sm font-semibold" style={{ color: texto }}>{label}</p>
            {totalOrdenes > 0 && (
              <div className="mt-3 rounded-full h-1.5" style={{ backgroundColor: 'rgba(0,0,0,0.08)' }}>
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: `${((resumen?.estados[key] || 0) / totalOrdenes) * 100}%`,
                    backgroundColor: barra
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Analíticas (solo admin) ── */}
      {esAdmin && analiticas && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total clientes', value: analiticas.totalClientes },
              { label: 'Ticket promedio', value: formatearMoneda(analiticas.ticketPromedio) },
              { label: 'Órdenes activas', value: ordenesActivas },
              { label: 'Ingreso del período', value: formatearMoneda(ingresoTotal) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-200 p-4">
                <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
                <p className="text-xl font-bold text-gray-900">{value}</p>
              </div>
            ))}
          </div>

          {/* Gráfica de ingresos */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
              <h3 className="font-bold text-gray-900">Ingresos</h3>
              <div className="flex items-center gap-2 flex-wrap">
                {periodo === 'anio' && (
                  <select
                    value={anio}
                    onChange={e => setAnio(e.target.value)}
                    className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-semibold text-gray-700 bg-white focus:outline-none focus:border-gray-400"
                  >
                    {anosDisponibles.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                )}
                <div className="flex gap-1 rounded-lg p-1" style={{ backgroundColor: '#F3F4F6' }}>
                  {[
                    { key: 'dia', label: 'Días' },
                    { key: 'semana', label: 'Semanas' },
                    { key: 'mes', label: 'Meses' },
                    { key: 'anio', label: 'Año' }
                  ].map(p => (
                    <button
                      key={p.key}
                      onClick={() => setPeriodo(p.key)}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
                      style={periodo === p.key
                        ? { backgroundColor: '#3B30D0', color: '#fff' }
                        : { color: '#6B7280' }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {datosGrafica.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
                Sin datos aún para este período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={datosGrafica} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIngreso" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B30D0" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#3B30D0" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="x" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#9CA3AF' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => v >= 1000 ? `Q${(v / 1000).toFixed(1)}k` : `Q${v}`}
                  />
                  <Tooltip content={<TooltipMoneda />} />
                  <Area
                    type="monotone"
                    dataKey="ingreso"
                    name="ingreso"
                    stroke="#3B30D0"
                    strokeWidth={2.5}
                    fill="url(#colorIngreso)"
                    dot={false}
                    activeDot={{ r: 5, fill: '#3B30D0' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Servicios y marcas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-bold text-gray-900 mb-4">Servicios más solicitados</h3>
              {analiticas.serviciosMasSolicitados.length === 0 ? (
                <p className="text-sm text-gray-400">Sin datos aún</p>
              ) : (
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(160, analiticas.serviciosMasSolicitados.length * 34)}
                >
                  <BarChart
                    data={analiticas.serviciosMasSolicitados}
                    layout="vertical"
                    margin={{ top: 0, right: 20, bottom: 0, left: 0 }}
                  >
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fill: '#9CA3AF' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="servicio"
                      tick={{ fontSize: 10, fill: '#374151' }}
                      axisLine={false}
                      tickLine={false}
                      width={152}
                    />
                    <Tooltip formatter={v => [v, 'Órdenes']} />
                    <Bar dataKey="cantidad" fill="#3B30D0" radius={[0, 4, 4, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-bold text-gray-900 mb-4">Clientes nuevos vs recurrentes</h3>
              {(() => {
                const totalNuevos = analiticas.clientesNuevosVsRecurrentes.reduce((s, d) => s + d.nuevos, 0)
                const totalRecurrentes = analiticas.clientesNuevosVsRecurrentes.reduce((s, d) => s + d.recurrentes, 0)
                const total = totalNuevos + totalRecurrentes
                if (total === 0) return <p className="text-sm text-gray-400">Sin datos aún</p>
                const pieData = [
                  { name: 'Nuevos', value: totalNuevos, color: '#3DDBA0' },
                  { name: 'Recurrentes', value: totalRecurrentes, color: '#3B30D0' },
                ]
                return (
                  <div className="flex items-center gap-6">
                    <div className="shrink-0">
                      <PieChart width={150} height={150}>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={42}
                          outerRadius={65}
                          strokeWidth={0}
                        >
                          {pieData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v, name) => [v, name]} />
                      </PieChart>
                    </div>
                    <div className="space-y-3 flex-1">
                      {pieData.map(d => (
                        <div key={d.name} className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                          <span className="text-xs text-gray-600">{d.name}</span>
                          <span className="text-xs font-bold text-gray-900 ml-auto">{d.value}</span>
                          <span className="text-xs text-gray-400 w-10 text-right">
                            {Math.round((d.value / total) * 100)}%
                          </span>
                        </div>
                      ))}
                      <p className="text-xs text-gray-400 pt-1 border-t border-gray-100">Últimos 12 meses</p>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>

          {/* Género y forma de pago */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-bold text-gray-900 mb-4">Clientes por género</h3>
              {!generoConDatos ? (
                <p className="text-sm text-gray-400">Sin datos de género registrados aún</p>
              ) : (
                <div className="flex items-center gap-6">
                  <div className="shrink-0">
                    <PieChart width={150} height={150}>
                      <Pie
                        data={analiticas.distribucionGenero.filter(d => d.cantidad > 0)}
                        dataKey="cantidad"
                        nameKey="genero"
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={65}
                        strokeWidth={0}
                      >
                        {analiticas.distribucionGenero
                          .filter(d => d.cantidad > 0)
                          .map((entry, i) => (
                            <Cell key={i} fill={COLORES_GENERO[i % COLORES_GENERO.length]} />
                          ))}
                      </Pie>
                      <Tooltip formatter={(v, name) => [v, ETIQUETAS_GENERO[name] || name]} />
                    </PieChart>
                  </div>
                  <div className="space-y-2.5 flex-1">
                    {analiticas.distribucionGenero
                      .filter(d => d.cantidad > 0)
                      .map((d, i) => (
                        <div key={d.genero} className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: COLORES_GENERO[i % COLORES_GENERO.length] }}
                          />
                          <span className="text-xs text-gray-600">
                            {ETIQUETAS_GENERO[d.genero] || d.genero}
                          </span>
                          <span className="text-xs font-bold text-gray-900 ml-auto">{d.cantidad}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-bold text-gray-900 mb-4">Forma de pago</h3>
              {analiticas.distribucionFormaPago.length === 0 ? (
                <p className="text-sm text-gray-400">Sin datos aún</p>
              ) : (
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart
                    data={analiticas.distribucionFormaPago}
                    margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
                  >
                    <XAxis
                      dataKey="formaPago"
                      tick={{ fontSize: 11, fill: '#374151' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={v => ({ efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta' })[v] || v}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#9CA3AF' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip formatter={v => [v, 'Órdenes']} />
                    <Bar dataKey="cantidad" fill="#3B30D0" radius={[4, 4, 0, 0]} maxBarSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Cumpleaños ── */}
      {(resumen?.cumpleanos?.hoy?.length > 0 || resumen?.cumpleanos?.semana?.length > 0) && (
        <div className="bg-white rounded-2xl border border-pink-100 p-5 mb-6"
          style={{ background: 'linear-gradient(135deg, #fff5fb 0%, #ffffff 60%)' }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🎂</span>
            <h3 className="font-bold text-gray-900">Cumpleaños</h3>
          </div>

          {resumen.cumpleanos.hoy.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-pink-500 uppercase tracking-wide mb-2">Hoy</p>
              <div className="space-y-2">
                {resumen.cumpleanos.hoy.map(c => (
                  <div key={c.id} className="flex items-center gap-3 rounded-xl px-4 py-2.5"
                    style={{ backgroundColor: '#FDF2F8', border: '1px solid #FBCFE8' }}>
                    <span className="text-lg">🎉</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{c.nombre}</p>
                      {c.correo && (
                        <p className="text-xs text-gray-400 truncate">{c.correo}</p>
                      )}
                    </div>
                    <span className="text-xs font-bold px-2 py-1 rounded-full shrink-0"
                      style={{ backgroundColor: '#EC4899', color: '#ffffff' }}>
                      Hoy
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {resumen.cumpleanos.semana.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Esta semana</p>
              <div className="space-y-1.5">
                {resumen.cumpleanos.semana.map(c => (
                  <div key={c.id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors">
                    <span className="text-base">🎈</span>
                    <p className="flex-1 text-sm text-gray-700 truncate">{c.nombre}</p>
                    <span className="text-xs text-gray-400 shrink-0">
                      en {c.diasParaCumple} {c.diasParaCumple === 1 ? 'día' : 'días'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Secciones existentes ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Órdenes de hoy */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">Órdenes de hoy</h3>
            <span
              className="text-sm font-semibold px-3 py-1 rounded-full"
              style={{ backgroundColor: '#EDFBF5', color: '#28B882' }}
            >
              {formatearMoneda(resumen?.ingresoHoy || 0)} entregados
            </span>
          </div>
          {resumen?.ordenesHoy?.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center">
              <p className="text-gray-400 text-sm">Sin órdenes hoy</p>
            </div>
          ) : (
            <div className="space-y-3">
              {resumen?.ordenesHoy?.map(orden => (
                <OrdenCard key={orden.id} orden={orden} />
              ))}
            </div>
          )}
        </div>

        {/* Próximas a entregar */}
        <div>
          <h3 className="font-bold text-gray-900 mb-3">Próximas a entregar</h3>
          {resumen?.proximasEntregas?.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center">
              <p className="text-gray-400 text-sm">Sin entregas próximas</p>
            </div>
          ) : (
            <div className="space-y-2">
              {resumen?.proximasEntregas?.map(orden => {
                const esExpress = orden.items?.some(i =>
                  i.servicio?.toLowerCase().startsWith('limpieza express')
                )
                return (
                  <div
                    key={orden.id}
                    onClick={() => navigate(`/ordenes/${orden.id}`)}
                    className="rounded-xl p-3 flex items-center justify-between cursor-pointer hover:shadow-sm transition-all"
                    style={{
                      backgroundColor: esExpress ? '#FFF5F5' : '#ffffff',
                      border: `1px solid ${esExpress ? '#FECACA' : '#E5E7EB'}`,
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = esExpress ? '#F87171' : '#3B30D0'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = esExpress ? '#FECACA' : '#E5E7EB'}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-gray-900">#{orden.numeroOrden}</p>
                        {esExpress && (
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded-md" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
                            ⚡ Express
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{orden.cliente?.nombre}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <EstadoBadge estado={orden.estado} />
                      <span className="text-xs text-gray-500">{formatearFecha(orden.fechaEntrega)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
