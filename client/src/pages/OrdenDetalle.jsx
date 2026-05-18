import { useEffect, useState } from 'react'

const IconShoe = () => (
  <svg width="14" height="12" viewBox="0 0 32 20" fill="currentColor">
    <path d="M2 14C2 14 4 10 6 9L8 6L10.5 8.5L13.5 7L17 10L21 9C23 9 27 10.5 29 13C30 13.5 30 14 30 14H2Z"/>
    <rect x="1" y="14" width="30" height="5" rx="2.5"/>
  </svg>
)

const IconBag = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
)
import { useParams, useNavigate } from 'react-router-dom'
import { obtenerOrden, cambiarEstado, eliminarOrden, actualizarOrden } from '../api/ordenes'
import { enviarCorreo } from '../api/notificaciones'
import Layout from '../components/Layout'
import EstadoBadge from '../components/EstadoBadge'
import ModalConfirmar from '../components/ModalConfirmar'
import { formatearFecha, formatearMoneda } from '../utils/formatters'

const FLUJO = ['pendiente', 'en_proceso', 'listo', 'entregado']

const ACCIONES = {
  pendiente: { siguiente: 'en_proceso', etiqueta: 'Marcar En Proceso', color: 'bg-blue-600 hover:bg-blue-700' },
  en_proceso: { siguiente: 'listo', etiqueta: 'Marcar Listo', color: 'bg-green-600 hover:bg-green-700' },
  listo: { siguiente: 'entregado', etiqueta: 'Marcar Entregado', color: 'bg-gray-700 hover:bg-gray-800' },
  entregado: null
}

export default function OrdenDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [orden, setOrden] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [cambiandoEstado, setCambiandoEstado] = useState(false)
  const [enviandoCorreo, setEnviandoCorreo] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [modalEliminar, setModalEliminar] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [modalListo, setModalListo] = useState(false)
  const [urlFotosListo, setUrlFotosListo] = useState('')
  const [editandoUrlFotos, setEditandoUrlFotos] = useState(false)
  const [nuevaUrlFotos, setNuevaUrlFotos] = useState('')
  const [guardandoUrlFotos, setGuardandoUrlFotos] = useState(false)
  const [tipoEntrega, setTipoEntrega] = useState('completa') // 'completa' o 'express'

  const cargar = () => {
    setCargando(true)
    obtenerOrden(parseInt(id))
      .then(({ data }) => setOrden(data))
      .catch(() => navigate('/ordenes'))
      .finally(() => setCargando(false))
  }

  useEffect(() => { cargar() }, [id])

  const handleCambiarEstado = async () => {
    const accion = ACCIONES[orden.estado]
    if (!accion) return
    if (accion.siguiente === 'listo') {
      setUrlFotosListo('')
      setTipoEntrega('completa')
      setModalListo(true)
      return
    }
    setCambiandoEstado(true)
    try {
      await cambiarEstado(orden.id, accion.siguiente)
      setMensaje('✅ Estado actualizado.')
      cargar()
    } catch {
      setMensaje('❌ Error al cambiar el estado')
    } finally {
      setCambiandoEstado(false)
    }
  }

  const handleConfirmarListo = async () => {
    setCambiandoEstado(true)
    try {
      await cambiarEstado(orden.id, 'listo', { 
        urlFotosListo,
        entregaParcial: tipoEntrega === 'express'
      })
      setModalListo(false)
      setMensaje(orden.cliente?.correo
        ? '✅ Estado actualizado. Correo enviado al cliente.'
        : '✅ Estado actualizado.')
      cargar()
    } catch {
      setMensaje('❌ Error al cambiar el estado')
    } finally {
      setCambiandoEstado(false)
    }
  }

  const handleEnviarCorreo = async () => {
    setEnviandoCorreo(true)
    try {
      await enviarCorreo(orden.id)
      setMensaje('✅ Correo enviado correctamente')
    } catch (err) {
      setMensaje('❌ ' + (err.response?.data?.mensaje || 'Error al enviar el correo'))
    } finally {
      setEnviandoCorreo(false)
    }
  }

  const handleEliminar = async () => {
    setEliminando(true)
    try {
      await eliminarOrden(orden.id)
      navigate('/ordenes')
    } catch {
      setMensaje('❌ Error al eliminar la orden')
      setModalEliminar(false)
    } finally {
      setEliminando(false)
    }
  }

  const handleGuardarUrlFotos = async () => {
    setGuardandoUrlFotos(true)
    try {
      await actualizarOrden(orden.id, { urlFotos: nuevaUrlFotos })
      setMensaje('✅ URL de fotografías guardada')
      setEditandoUrlFotos(false)
      cargar()
    } catch {
      setMensaje('❌ Error al guardar la URL')
    } finally {
      setGuardandoUrlFotos(false)
    }
  }

  const iniciarEdicionUrlFotos = () => {
    setNuevaUrlFotos(orden.urlFotos || '')
    setEditandoUrlFotos(true)
  }

  if (cargando) {
    return <Layout><div className="flex items-center justify-center h-64 text-gray-400">Cargando...</div></Layout>
  }

  if (!orden) return null

  const saldo = parseFloat(orden.total) - parseFloat(orden.anticipo)
  const accion = ACCIONES[orden.estado]
  
  // Detectar si hay mezcla de express y normales
  const itemsExpress = orden.items?.filter(item => 
    item.servicio?.toLowerCase().includes('express')
  ) || []
  const itemsNormales = orden.items?.filter(item => 
    !item.servicio?.toLowerCase().includes('express')
  ) || []
  const hayMixExpressNormales = itemsExpress.length > 0 && itemsNormales.length > 0

  return (
    <Layout>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/ordenes')} className="text-gray-400 hover:text-gray-600">←</button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Orden #{orden.numeroOrden}</h2>
          <p className="text-sm text-gray-500">Creada el {formatearFecha(orden.createdAt)}</p>
        </div>
      </div>

      {mensaje && (
        <div className="mb-4 bg-blue-50 text-blue-800 rounded-lg px-4 py-3 text-sm flex justify-between">
          {mensaje}
          <button onClick={() => setMensaje('')} className="text-blue-400 hover:text-blue-600">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-5">
          {/* Estado */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-500">Estado actual:</span>
                <EstadoBadge estado={orden.estado} />
              </div>
              {accion && (
                <button
                  onClick={handleCambiarEstado}
                  disabled={cambiandoEstado}
                  className={`px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50 transition-colors ${accion.color}`}
                >
                  {cambiandoEstado ? 'Actualizando...' : accion.etiqueta}
                </button>
              )}
            </div>
            {/* Barra de progreso */}
            <div className="flex gap-1 mt-4">
              {FLUJO.map((e, i) => (
                <div
                  key={e}
                  className="flex-1 h-1.5 rounded-full transition-all"
                  style={{ backgroundColor: FLUJO.indexOf(orden.estado) >= i ? '#3B30D0' : '#E5E7EB' }}
                />
              ))}
            </div>
          </div>

          {/* Artículos de la orden */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">
              Artículos ({orden.items?.length})
            </h3>
            <div className="space-y-3">
              {orden.items?.map((item, i) => {
                const esTenis   = item.tipoItem !== 'accesorio'
                const esExpress = item.servicio?.toLowerCase().startsWith('limpieza express')
                const etiqueta  = esTenis ? `Par #${i + 1}` : `Accesorio #${i + 1}`
                const detalle   = esTenis
                  ? [item.marca, item.tipoZapato, item.color, item.talla && `Talla ${item.talla}`].filter(Boolean).join(' · ')
                  : [item.tipoAccesorio, item.tamano && `Talla ${item.tamano}`, item.color].filter(Boolean).join(' · ')

                const borderColor = esExpress ? '#FECACA' : esTenis ? '#E0DCFF' : '#B8F0DC'
                const bgColor     = esExpress ? '#FFF5F5' : esTenis ? '#FAFAFE' : '#F4FDF9'
                const badgeBg     = esExpress ? '#FEE2E2' : esTenis ? '#EEEEFF' : '#DCFDF0'
                const badgeColor  = esExpress ? '#DC2626' : esTenis ? '#3B30D0' : '#1a7a52'

                return (
                  <div key={item.id} className="border rounded-xl p-3 overflow-hidden"
                    style={{ borderColor, backgroundColor: bgColor }}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                            style={{ backgroundColor: badgeBg, color: badgeColor }}
                          >
                            {esTenis ? <IconShoe /> : <IconBag />}
                            {etiqueta}
                          </span>
                          <span
                            className="text-xs font-semibold"
                            style={{ color: esExpress ? '#DC2626' : '#6B7280' }}
                          >
                            {esExpress && '⚡ '}{item.servicio || 'Sin servicio'}
                          </span>
                        </div>
                        {detalle && <p className="text-xs text-gray-500">{detalle}</p>}
                        {item.extras && <p className="text-xs mt-1" style={{ color: '#3B30D0' }}>{item.extras}</p>}
                      </div>
                      <span className="font-bold text-gray-900 text-sm ml-3">{formatearMoneda(item.precio)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Notificaciones */}
          {orden.notificaciones?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Historial de notificaciones</h3>
              <div className="space-y-2">
                {orden.notificaciones.map(n => (
                  <div key={n.id} className="flex items-center justify-between text-sm">
                    <span className={n.estado === 'enviado' ? 'text-green-600' : 'text-red-500'}>
                      {n.estado === 'enviado' ? '✉️' : '❌'} {n.mensaje}
                    </span>
                    <span className="text-gray-400 text-xs">{formatearFecha(n.enviadoAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar derecho */}
        <div className="space-y-5">
          {/* Cliente */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Cliente</h3>
            <p className="font-medium text-gray-900">{orden.cliente?.nombre}</p>
            {orden.cliente?.telefono && (
              <p className="text-sm text-gray-500 mt-1">📞 {orden.cliente.telefono}</p>
            )}
            {orden.cliente?.correo && (
              <p className="text-sm text-gray-500 mt-0.5">✉️ {orden.cliente.correo}</p>
            )}
            {orden.cliente?.nit && (
              <p className="text-sm text-gray-500 mt-0.5">NIT: {orden.cliente.nit}</p>
            )}
            <button
              onClick={() => navigate(`/clientes/${orden.cliente?.id}`)}
              className="mt-3 text-xs text-blue-600 hover:text-blue-700"
            >
              Ver historial →
            </button>
          </div>

          {/* Pago */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Pago</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Forma de pago</span>
                <span className="font-medium">{
                  { efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta de crédito' }[orden.formaPago] || orden.formaPago || '—'
                }</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total</span>
                <span className="font-bold text-gray-900">{formatearMoneda(orden.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Anticipo</span>
                <span className="text-green-700">- {formatearMoneda(orden.anticipo)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-2">
                <span className="font-medium text-gray-700">Saldo pendiente</span>
                <span className={`font-bold ${saldo > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {formatearMoneda(saldo)}
                </span>
              </div>
            </div>
          </div>

          {/* Fechas */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Fechas</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Ingreso</span>
                <span>{formatearFecha(orden.fechaIngreso)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Entrega estimada</span>
                <span>{formatearFecha(orden.fechaEntrega)}</span>
              </div>
            </div>
            
            {/* URL de fotografías de recepción - Editable */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500">Fotos de recepción</p>
                {!editandoUrlFotos && (
                  <button
                    onClick={iniciarEdicionUrlFotos}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    {orden.urlFotos ? 'Editar' : '+ Agregar'}
                  </button>
                )}
              </div>
              
              {editandoUrlFotos ? (
                <div className="space-y-2">
                  <input
                    type="url"
                    value={nuevaUrlFotos}
                    onChange={e => setNuevaUrlFotos(e.target.value)}
                    placeholder="https://photos.google.com/album/..."
                    className="w-full text-xs rounded border border-gray-300 px-2 py-1.5 focus:outline-none focus:border-blue-400"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditandoUrlFotos(false)}
                      className="flex-1 text-xs border border-gray-300 text-gray-600 rounded py-1.5 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleGuardarUrlFotos}
                      disabled={guardandoUrlFotos}
                      className="flex-1 text-xs text-white rounded py-1.5 disabled:opacity-50"
                      style={{ backgroundColor: '#3B30D0' }}
                    >
                      {guardandoUrlFotos ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              ) : orden.urlFotos ? (
                <a href={orden.urlFotos} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 break-all underline">
                  Ver álbum →
                </a>
              ) : (
                <p className="text-xs text-gray-400 italic">Sin fotografías</p>
              )}
            </div>

            {orden.urlFotosListo && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1">✅ Fotos de entrega</p>
                <a href={orden.urlFotosListo} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-green-600 hover:text-green-800 break-all underline">
                  Ver álbum →
                </a>
              </div>
            )}
            {orden.notas && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Notas</p>
                <p className="text-sm text-gray-700">{orden.notas}</p>
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="space-y-2">
            {orden.cliente?.correo && (
              <button
                onClick={handleEnviarCorreo}
                disabled={enviandoCorreo}
                className="w-full border border-blue-300 text-blue-700 rounded-lg py-2 text-sm font-medium hover:bg-blue-50 disabled:opacity-50"
              >
                {enviandoCorreo ? 'Enviando...' : '✉️ Enviar correo al cliente'}
              </button>
            )}
            <button
              onClick={() => setModalEliminar(true)}
              className="w-full border border-red-300 text-red-600 rounded-lg py-2 text-sm font-medium hover:bg-red-50"
            >
              Eliminar orden
            </button>
          </div>
        </div>
      </div>

      {modalListo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Marcar como Lista</h3>
            <p className="text-sm text-gray-500 mb-5">
              Ingresa el enlace del álbum con las fotos de los artículos ya limpios y listos para entregar.
            </p>

            {/* Opciones de tipo de entrega si hay mix express/normales */}
            {hayMixExpressNormales && (
              <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm font-semibold text-amber-900 mb-3">
                  ⚡ Esta orden tiene artículos express y normales
                </p>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border-2 transition-colors"
                    style={{
                      borderColor: tipoEntrega === 'express' ? '#3B30D0' : '#E5E7EB',
                      backgroundColor: tipoEntrega === 'express' ? '#F0EEFF' : 'white'
                    }}>
                    <input
                      type="radio"
                      name="tipoEntrega"
                      value="express"
                      checked={tipoEntrega === 'express'}
                      onChange={e => setTipoEntrega(e.target.value)}
                      className="mt-0.5"
                      style={{ accentColor: '#3B30D0' }}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">Solo artículos express listos</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {itemsExpress.length} artículo(s) express • Los demás se entregarán el {formatearFecha(orden.fechaEntrega)}
                      </p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border-2 transition-colors"
                    style={{
                      borderColor: tipoEntrega === 'completa' ? '#3B30D0' : '#E5E7EB',
                      backgroundColor: tipoEntrega === 'completa' ? '#F0EEFF' : 'white'
                    }}>
                    <input
                      type="radio"
                      name="tipoEntrega"
                      value="completa"
                      checked={tipoEntrega === 'completa'}
                      onChange={e => setTipoEntrega(e.target.value)}
                      className="mt-0.5"
                      style={{ accentColor: '#3B30D0' }}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">Todos los artículos están listos</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {orden.items?.length} artículos completos
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL de fotografías de entrega *
            </label>
            <input
              type="url"
              value={urlFotosListo}
              onChange={e => setUrlFotosListo(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-1 focus:outline-none focus:border-indigo-400"
              placeholder="https://photos.google.com/album/..."
              autoFocus={!hayMixExpressNormales}
            />
            <p className="text-xs text-gray-400 mb-5">El botón se habilitará al ingresar una URL válida</p>
            <div className="flex gap-3">
              <button
                onClick={() => setModalListo(false)}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarListo}
                disabled={!urlFotosListo.trim() || cambiandoEstado}
                className="flex-1 text-white rounded-lg py-2 text-sm font-bold disabled:opacity-40 transition-colors"
                style={{ backgroundColor: '#16A34A' }}
              >
                {cambiandoEstado ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalEliminar && (
        <ModalConfirmar
          titulo="Eliminar orden"
          mensaje={`¿Estás seguro de eliminar la orden #${orden.numeroOrden}? Esta acción no se puede deshacer.`}
          onConfirmar={handleEliminar}
          onCancelar={() => setModalEliminar(false)}
          cargando={eliminando}
        />
      )}
    </Layout>
  )
}
