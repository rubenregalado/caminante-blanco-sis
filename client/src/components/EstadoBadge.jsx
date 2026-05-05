const estilos = {
  pendiente:  { backgroundColor: '#FEF9C3', color: '#854D0E' },
  en_proceso: { backgroundColor: '#EEEEFF', color: '#3B30D0' },
  listo:      { backgroundColor: '#DCFCE7', color: '#166534' },
  entregado:  { backgroundColor: '#F3F4F6', color: '#4B5563' }
}

const etiquetas = {
  pendiente:  'Pendiente',
  en_proceso: 'En proceso',
  listo:      'Listo',
  entregado:  'Entregado'
}

export default function EstadoBadge({ estado }) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={estilos[estado] || { backgroundColor: '#F3F4F6', color: '#4B5563' }}
    >
      {etiquetas[estado] || estado}
    </span>
  )
}
