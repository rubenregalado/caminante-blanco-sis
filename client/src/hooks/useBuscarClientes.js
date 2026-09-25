import { useEffect, useRef, useState } from 'react'
import { listarClientes } from '../api/clientes'

// Búsqueda de clientes con espera y descarte de respuestas viejas.
//
// Antes se lanzaba una petición por cada tecla, sin cancelar las anteriores.
// Con 256 clientes las respuestas llegaban desordenadas y una respuesta vieja
// pisaba a la buena: la lista salía vacía, el mostrador creía que el cliente no
// existía y lo volvía a crear. De ahí venían los duplicados.
//
// El contador `peticionRef` garantiza que solo la respuesta de la última
// búsqueda pintada llegue a la pantalla.
export default function useBuscarClientes(termino, { espera = 250 } = {}) {
  const [clientes, setClientes] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [recarga, setRecarga] = useState(0)
  const peticionRef = useRef(0)

  useEffect(() => {
    const idPeticion = ++peticionRef.current
    setBuscando(true)

    const temporizador = setTimeout(() => {
      listarClientes(termino)
        .then(({ data }) => {
          if (idPeticion === peticionRef.current) setClientes(data)
        })
        .catch(() => {
          if (idPeticion === peticionRef.current) setClientes([])
        })
        .finally(() => {
          if (idPeticion === peticionRef.current) setBuscando(false)
        })
    }, espera)

    return () => clearTimeout(temporizador)
  }, [termino, espera, recarga])

  return { clientes, buscando, recargar: () => setRecarga(n => n + 1) }
}
