import { useState } from 'react'
import { actualizarCliente } from '../api/clientes'
import ClienteCampos from './ClienteCampos'

// Edición rápida desde el listado, pensada para completar datos que faltan
// (teléfono, correo, cumpleaños) sin tener que entrar a la ficha de cada uno.
export default function ModalEditarCliente({ cliente, onGuardado, onCancelar }) {
  const [valores, setValores] = useState(cliente)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const handleGuardar = async (e) => {
    e.preventDefault()
    if (!String(valores.nombre || '').trim()) { setError('El nombre es requerido'); return }
    if (guardando) return
    setGuardando(true)
    setError('')
    try {
      const { data } = await actualizarCliente(cliente.id, valores)
      onGuardado(data)
    } catch (err) {
      setError(err.response?.data?.mensaje || 'No se pudo guardar el cliente')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleGuardar} className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Editar cliente</h3>
          <p className="text-sm text-gray-500 mb-4">
            {cliente._count?.ordenes
              ? `${cliente._count.ordenes} orden(es) en su historial`
              : 'Sin órdenes registradas'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ClienteCampos valores={valores} onCambio={setValores} />
          </div>

          {error && <p className="text-red-600 text-sm mt-4">{error}</p>}

          <div className="flex gap-3 justify-end mt-6">
            <button
              type="button"
              onClick={onCancelar}
              disabled={guardando}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60"
              style={{ backgroundColor: '#3B30D0' }}
            >
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
