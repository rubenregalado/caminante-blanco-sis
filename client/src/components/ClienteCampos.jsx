// Campos de un cliente. Lo usan el formulario de alta y el de edición, para
// que no haya dos copias del mismo formulario que se desincronicen al agregar
// una columna nueva.
export default function ClienteCampos({ valores, onCambio }) {
  const set = (campo, valor) => onCambio({ ...valores, [campo]: valor })

  return (
    <>
      {[
        ['nombre',   'Nombre *',             'text'],
        ['telefono', 'Teléfono',             'text'],
        ['nit',      'NIT (CF si no tiene)', 'text'],
        ['correo',   'Correo electrónico',   'email'],
      ].map(([campo, label, tipo]) => (
        <div key={campo}>
          <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
          <input
            type={tipo}
            value={valores[campo] || ''}
            onChange={(e) => set(campo, e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      ))}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Género</label>
        <select
          value={valores.genero || ''}
          onChange={(e) => set('genero', e.target.value)}
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
          value={valores.fechaNacimiento ? String(valores.fechaNacimiento).slice(0, 10) : ''}
          onChange={(e) => set('fechaNacimiento', e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
        <input
          type="text"
          value={valores.direccion || ''}
          onChange={(e) => set('direccion', e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
    </>
  )
}
