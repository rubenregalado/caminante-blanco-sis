import { useEffect, useState } from 'react'
import { obtenerCierreDiario, guardarCierreDiario } from '../api/dashboard'
import { formatearMoneda } from '../utils/formatters'

const ETIQUETA_METODO = {
  efectivo:      'Efectivo',
  transferencia: 'Transferencia',
  tarjeta:       'Tarjeta',
}

const COLOR_METODO = {
  efectivo:      { texto: '#16A34A', fondo: '#F0FDF4', borde: '#BBF7D0' },
  transferencia: { texto: '#3B30D0', fondo: '#EEF2FF', borde: '#C7D2FE' },
  tarjeta:       { texto: '#B45309', fondo: '#FFFBEB', borde: '#FDE68A' },
}

const formatearHora = (momento) => {
  if (!momento) return ''
  const d = new Date(momento)
  return isNaN(d) ? '' : d.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })
}

const formatearFechaCorta = (fechaISO) => {
  const [anio, mes, dia] = String(fechaISO).slice(0, 10).split('-').map(Number)
  return new Date(anio, mes - 1, dia).toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit' })
}

const formatearFechaLarga = (fechaISO) => {
  const [anio, mes, dia] = fechaISO.split('-').map(Number)
  return new Date(anio, mes - 1, dia).toLocaleDateString('es-GT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default function ModalCierreDiario({ fecha, onCerrar, onGuardado }) {
  const [cierre, setCierre] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [cajaChica, setCajaChica] = useState('')
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    obtenerCierreDiario(fecha)
      .then(({ data }) => {
        setCierre(data)
        setCajaChica(data.cierre ? String(data.cierre.cajaChica) : '')
        setNotas(data.cierre?.notas || '')
      })
      .catch(err => setError(err.response?.data?.mensaje || 'No se pudo cargar el cierre del día'))
      .finally(() => setCargando(false))
  }, [fecha])

  const montoCajaChica = parseFloat(cajaChica || 0)
  const aRetirar = cierre ? Math.max(0, cierre.efectivoEnCaja - montoCajaChica) : 0
  const excedeCaja = cierre ? montoCajaChica > cierre.efectivoEnCaja : false

  const handleGuardar = async () => {
    setMensaje('')
    setError('')
    setGuardando(true)
    try {
      await guardarCierreDiario({ fecha: cierre.fecha, cajaChica: montoCajaChica, notas })
      const { data } = await obtenerCierreDiario(cierre.fecha)
      setCierre(data)
      setMensaje('✅ Cierre guardado')
      onGuardado?.()
    } catch (err) {
      setError(err.response?.data?.mensaje || 'No se pudo guardar el cierre')
    } finally {
      setGuardando(false)
    }
  }

  useEffect(() => {
    const alPresionar = (e) => { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [onCerrar])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-full flex flex-col">

        <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">Cierre del día</h3>
            {cierre && (
              <p className="text-xs text-gray-400 mt-0.5 capitalize">
                {formatearFechaLarga(cierre.fecha)}
              </p>
            )}
          </div>
          <button
            onClick={onCerrar}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none shrink-0"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {cargando && <p className="text-center text-gray-400 py-8">Cargando...</p>}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {cierre && !cargando && (
            <>
              {/* Cuadre del cajón: lo que quedó de ayer + lo que entró hoy */}
              <div className="rounded-xl p-4" style={{ backgroundColor: '#F0FDF4', border: '2px solid #BBF7D0' }}>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">
                      Saldo inicial (caja chica)
                      {cierre.saldoInicialDesde && (
                        <span className="text-xs text-gray-400 block">
                          dejado el {formatearFechaCorta(cierre.saldoInicialDesde)}
                        </span>
                      )}
                    </span>
                    <span className="font-medium text-gray-700">{formatearMoneda(cierre.saldoInicial)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Efectivo recibido hoy</span>
                    <span className="font-medium text-gray-700">+ {formatearMoneda(cierre.totales.efectivo)}</span>
                  </div>
                </div>

                <div className="border-t mt-3 pt-3 text-center" style={{ borderColor: '#BBF7D0' }}>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#16A34A' }}>
                    Efectivo que debe haber en caja
                  </p>
                  <p className="text-3xl font-bold mt-1" style={{ color: '#16A34A' }}>
                    {formatearMoneda(cierre.efectivoEnCaja)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Transferencias y tarjeta no entran al cajón
                  </p>
                </div>
              </div>

              {/* Caja chica que se deja para el día siguiente */}
              <div className="rounded-xl border border-gray-200 p-4">
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Se deja en caja chica para mañana
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  Será el saldo inicial del siguiente día de trabajo
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-500">Q</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={cajaChica}
                    onChange={e => setCajaChica(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                  />
                </div>

                {excedeCaja && (
                  <p className="text-xs text-amber-600 mt-2">
                    El monto es mayor que el efectivo en caja ({formatearMoneda(cierre.efectivoEnCaja)}).
                  </p>
                )}

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <span className="text-sm text-gray-600">A retirar del cajón</span>
                  <span className="text-lg font-bold" style={{ color: '#3B30D0' }}>
                    {formatearMoneda(aRetirar)}
                  </span>
                </div>

                <textarea
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                  rows={2}
                  placeholder="Notas del cierre (opcional)"
                  className="w-full mt-3 rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:border-gray-400"
                />

                <button
                  onClick={handleGuardar}
                  disabled={guardando || cajaChica === ''}
                  className="w-full mt-3 text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-50"
                  style={{ backgroundColor: '#3B30D0' }}
                >
                  {guardando ? 'Guardando...' : cierre.cierre ? 'Actualizar cierre' : 'Guardar cierre'}
                </button>

                {cierre.cierre && (
                  <p className="text-xs text-gray-400 text-center mt-2">
                    Cierre registrado por {formatearMoneda(cierre.cierre.cajaChica)}
                  </p>
                )}

                {mensaje && <p className="text-xs text-center mt-2" style={{ color: '#16A34A' }}>{mensaje}</p>}
              </div>

              <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                <span className="text-sm font-medium text-gray-600">Total ingresado hoy</span>
                <span className="text-xl font-bold" style={{ color: '#3B30D0' }}>
                  {formatearMoneda(cierre.totales.total)}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {['efectivo', 'transferencia', 'tarjeta'].map(metodo => {
                  const c = COLOR_METODO[metodo]
                  return (
                    <div
                      key={metodo}
                      className="rounded-xl p-3 text-center"
                      style={{ backgroundColor: c.fondo, border: `1px solid ${c.borde}` }}
                    >
                      <p className="text-xs font-semibold mb-1" style={{ color: c.texto }}>
                        {ETIQUETA_METODO[metodo]}
                      </p>
                      <p className="text-base font-bold" style={{ color: c.texto }}>
                        {formatearMoneda(cierre.totales[metodo])}
                      </p>
                    </div>
                  )
                })}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-700">Detalle de movimientos</h4>
                  <span className="text-xs text-gray-400">
                    {cierre.conteo.anticipos} anticipo{cierre.conteo.anticipos !== 1 ? 's' : ''}
                    {' · '}
                    {cierre.conteo.saldos} pago{cierre.conteo.saldos !== 1 ? 's' : ''} al entregar
                  </span>
                </div>

                {cierre.movimientos.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6 border border-dashed border-gray-200 rounded-xl">
                    No hubo movimientos de dinero este día
                  </p>
                ) : (
                  <div className="border border-gray-200 rounded-xl divide-y divide-gray-100">
                    {cierre.movimientos.map((m, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            #{m.numeroOrden} · {m.cliente}
                          </p>
                          <p className="text-xs text-gray-400">
                            {m.tipo === 'anticipo' ? 'Anticipo' : 'Pago al entregar'}
                            {' · '}{ETIQUETA_METODO[m.metodo] || m.metodo}
                            {formatearHora(m.momento) && ` · ${formatearHora(m.momento)}`}
                          </p>
                        </div>
                        <span
                          className="text-sm font-bold shrink-0"
                          style={{ color: (COLOR_METODO[m.metodo] || COLOR_METODO.efectivo).texto }}
                        >
                          {formatearMoneda(m.monto)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={onCerrar}
            className="w-full text-white rounded-xl py-2.5 text-sm font-bold"
            style={{ backgroundColor: '#3B30D0' }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
