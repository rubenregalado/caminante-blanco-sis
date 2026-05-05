import { useNavigate } from 'react-router-dom'
import EstadoBadge from './EstadoBadge'
import { formatearFecha, formatearMoneda } from '../utils/formatters'

export default function OrdenCard({ orden }) {
  const navigate = useNavigate()
  const saldo = parseFloat(orden.total) - parseFloat(orden.anticipo)
  const esExpress = orden.items?.some(i =>
    i.servicio?.toLowerCase().startsWith('limpieza express')
  )

  return (
    <div
      onClick={() => navigate(`/ordenes/${orden.id}`)}
      className="rounded-xl p-4 cursor-pointer transition-all group"
      style={{
        backgroundColor: esExpress ? '#FFF5F5' : '#ffffff',
        border: `1px solid ${esExpress ? '#FECACA' : '#E5E7EB'}`,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = esExpress ? '#F87171' : '#3B30D0'
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = esExpress ? '#FECACA' : '#E5E7EB'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-bold text-gray-900">#{orden.numeroOrden}</p>
            {esExpress && (
              <span
                className="text-xs font-bold px-1.5 py-0.5 rounded-md"
                style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}
              >
                ⚡ Express
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">{orden.cliente?.nombre}</p>
        </div>
        <EstadoBadge estado={orden.estado} />
      </div>
      <div className="flex gap-4 text-xs text-gray-400">
        <span>Ingreso: {formatearFecha(orden.fechaIngreso)}</span>
        {orden.fechaEntrega && (
          <span>Entrega: {formatearFecha(orden.fechaEntrega)}</span>
        )}
      </div>
      <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: `1px solid ${esExpress ? '#FEE2E2' : '#F3F4F6'}` }}>
        <span className="text-xs text-gray-400">{orden.items?.length || 0} par(es)</span>
        <div className="text-right">
          <p className="text-sm font-bold text-gray-900">{formatearMoneda(orden.total)}</p>
          {saldo > 0 && (
            <p className="text-xs text-orange-500">Saldo: {formatearMoneda(saldo)}</p>
          )}
        </div>
      </div>
    </div>
  )
}
