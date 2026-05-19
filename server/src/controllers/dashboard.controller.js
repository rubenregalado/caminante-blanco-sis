const { db, pool } = require('../lib/db')
const { clientes, ordenes } = require('../lib/schema')
const { eq, and, or, gte, lt, lte, asc, desc, inArray, count, sum, avg } = require('drizzle-orm')
const { findOrdenes } = require('../lib/helpers')

function calcularCumpleanos(clientesRows) {
  const ahora = new Date()
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())

  const cumpleHoy    = []
  const cumpleSemana = []

  for (const c of clientesRows) {
    if (!c.fecha_nacimiento) continue
    const fn = new Date(c.fecha_nacimiento)
    let bday = new Date(hoy.getFullYear(), fn.getMonth(), fn.getDate())
    // Si ya pasó este año, proyectar al siguiente
    if (bday < hoy) bday = new Date(hoy.getFullYear() + 1, fn.getMonth(), fn.getDate())

    const diffDias = Math.round((bday - hoy) / 86400000)

    const cliente = { id: c.id, nombre: c.nombre, correo: c.correo || null, fechaNacimiento: c.fecha_nacimiento }
    if (diffDias === 0)               cumpleHoy.push(cliente)
    else if (diffDias >= 1 && diffDias < 7) cumpleSemana.push({ ...cliente, diasParaCumple: diffDias })
  }

  cumpleSemana.sort((a, b) => a.diasParaCumple - b.diasParaCumple)
  return { cumpleHoy, cumpleSemana }
}

const obtenerResumen = async (req, res, next) => {
  try {
    const hoy = new Date()
    const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
    const finDia    = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1)
    const tresDias  = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 3)
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    const finMes    = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1)

    const [
      [{ cnt: cntPendientes }],
      [{ cnt: cntEnProceso }],
      [{ cnt: cntListos }],
      [{ cnt: cntEntregados }],
      ordenesHoy,
      proximasEntregas,
      [{ total: sumHoy }],
      [clientesConFecha],
      [{ total: sumMesTodo }],
      [{ total: sumMesEntregado }],
    ] = await Promise.all([
      db.select({ cnt: count() }).from(ordenes).where(eq(ordenes.estado, 'pendiente')),
      db.select({ cnt: count() }).from(ordenes).where(eq(ordenes.estado, 'en_proceso')),
      db.select({ cnt: count() }).from(ordenes).where(eq(ordenes.estado, 'listo')),
      db.select({ cnt: count() }).from(ordenes).where(eq(ordenes.estado, 'entregado')),
      findOrdenes({
        where:   and(gte(ordenes.createdAt, inicioDia), lt(ordenes.createdAt, finDia)),
        with:    { cliente: true },
        orderBy: [desc(ordenes.createdAt)],
        limit:   10,
      }),
      findOrdenes({
        where: and(
          inArray(ordenes.estado, ['pendiente', 'en_proceso']),
          gte(ordenes.fechaEntrega, inicioDia),
          lte(ordenes.fechaEntrega, tresDias)
        ),
        with:    { cliente: true, items: true },
        orderBy: [asc(ordenes.fechaEntrega)],
        limit:   5,
      }),
      db.select({ total: sum(ordenes.total) })
        .from(ordenes)
        .where(and(
          eq(ordenes.estado, 'entregado'),
          gte(ordenes.createdAt, inicioDia),
          lt(ordenes.createdAt, finDia)
        )),
      pool.promise().query(
        `SELECT id, nombre, correo, fecha_nacimiento FROM clientes WHERE fecha_nacimiento IS NOT NULL`
      ),
      // Total de todos los pedidos del mes (entregados + pendientes)
      db.select({ total: sum(ordenes.total) })
        .from(ordenes)
        .where(and(gte(ordenes.createdAt, inicioMes), lt(ordenes.createdAt, finMes))),
      // Solo los ya entregados (cobrado)
      db.select({ total: sum(ordenes.total) })
        .from(ordenes)
        .where(and(
          eq(ordenes.estado, 'entregado'),
          gte(ordenes.createdAt, inicioMes),
          lt(ordenes.createdAt, finMes)
        )),
    ])

    const { cumpleHoy, cumpleSemana } = calcularCumpleanos(clientesConFecha)

    const proyeccionMes = parseFloat(sumMesTodo || 0)
    const cobradoMes    = parseFloat(sumMesEntregado || 0)

    res.json({
      estados: {
        pendiente:  Number(cntPendientes),
        en_proceso: Number(cntEnProceso),
        listo:      Number(cntListos),
        entregado:  Number(cntEntregados),
      },
      ingresoHoy:  parseFloat(sumHoy || 0),
      ordenesHoy,
      proximasEntregas,
      cumpleanos:  { hoy: cumpleHoy, semana: cumpleSemana },
      proyeccionMes: {
        total:     proyeccionMes,
        cobrado:   cobradoMes,
        porCobrar: Math.max(0, proyeccionMes - cobradoMes),
      },
    })
  } catch (error) {
    next(error)
  }
}

const obtenerAnaliticas = async (req, res, next) => {
  try {
    const ahora = new Date()
    const hace30Dias = new Date(ahora)
    hace30Dias.setDate(ahora.getDate() - 30)
    const hace84Dias = new Date(ahora)
    hace84Dias.setDate(ahora.getDate() - 84)
    const hace365Dias = new Date(ahora)
    hace365Dias.setFullYear(ahora.getFullYear() - 3)
    const hace12Meses = new Date(ahora)
    hace12Meses.setFullYear(ahora.getFullYear() - 1)

    const [
      [ingresosPorDiaRows],
      [ingresosPorSemanaRows],
      [ingresosPorMesRows],
      [serviciosMasSolicitadosRows],
      [clientesNuevosVsRecurrentesRows],
      [distribucionGeneroRows],
      [distribucionFormaPagoRows],
      [{ cnt: cntClientes }],
      [{ avgTotal }],
    ] = await Promise.all([
      pool.promise().query(
        `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS fecha,
                SUM(total) AS ingreso, COUNT(*) AS ordenes
         FROM ordenes
         WHERE estado = 'entregado' AND created_at >= ?
         GROUP BY fecha ORDER BY fecha ASC`,
        [hace30Dias]
      ),
      pool.promise().query(
        `SELECT YEARWEEK(created_at, 1) AS semana,
                SUM(total) AS ingreso, COUNT(*) AS ordenes
         FROM ordenes
         WHERE estado = 'entregado' AND created_at >= ?
         GROUP BY semana ORDER BY semana ASC`,
        [hace84Dias]
      ),
      pool.promise().query(
        `SELECT DATE_FORMAT(created_at, '%Y-%m') AS mes,
                SUM(total) AS ingreso, COUNT(*) AS ordenes
         FROM ordenes
         WHERE estado = 'entregado' AND created_at >= ?
         GROUP BY mes ORDER BY mes ASC`,
        [hace365Dias]
      ),
      pool.promise().query(
        `SELECT servicio, COUNT(*) AS cantidad
         FROM items_orden
         WHERE servicio IS NOT NULL AND servicio != ''
         GROUP BY servicio ORDER BY cantidad DESC LIMIT 8`
      ),
      pool.promise().query(
        `SELECT
           mes,
           COUNT(DISTINCT CASE WHEN primera_orden_mes = mes THEN cliente_id END) AS nuevos,
           COUNT(DISTINCT CASE WHEN primera_orden_mes < mes THEN cliente_id END) AS recurrentes
         FROM (
           SELECT
             o.cliente_id,
             DATE_FORMAT(o.created_at, '%Y-%m') AS mes,
             (SELECT DATE_FORMAT(MIN(o2.created_at), '%Y-%m')
              FROM ordenes o2 WHERE o2.cliente_id = o.cliente_id) AS primera_orden_mes
           FROM ordenes o
           WHERE o.created_at >= ?
         ) t
         GROUP BY mes
         ORDER BY mes ASC`,
        [hace12Meses]
      ),
      pool.promise().query(
        `SELECT COALESCE(genero, 'no_especificado') AS genero, COUNT(*) AS cantidad
         FROM clientes
         GROUP BY genero`
      ),
      pool.promise().query(
        `SELECT forma_pago AS formaPago, COUNT(*) AS cantidad
         FROM ordenes
         WHERE forma_pago IS NOT NULL AND forma_pago != ''
         GROUP BY forma_pago ORDER BY cantidad DESC`
      ),
      db.select({ cnt: count() }).from(clientes),
      db.select({ avgTotal: avg(ordenes.total) }).from(ordenes).where(eq(ordenes.estado, 'entregado')),
    ])

    res.json({
      ingresosPorDia: ingresosPorDiaRows.map(r => ({
        fecha:   r.fecha,
        ingreso: Number(r.ingreso || 0),
        ordenes: Number(r.ordenes),
      })),
      ingresosPorSemana: ingresosPorSemanaRows.map(r => ({
        semana:  Number(r.semana),
        ingreso: Number(r.ingreso || 0),
        ordenes: Number(r.ordenes),
      })),
      ingresosPorMes: ingresosPorMesRows.map(r => ({
        mes:     r.mes,
        ingreso: Number(r.ingreso || 0),
        ordenes: Number(r.ordenes),
      })),
      serviciosMasSolicitados: serviciosMasSolicitadosRows.map(r => ({
        servicio: r.servicio,
        cantidad: Number(r.cantidad),
      })),
      clientesNuevosVsRecurrentes: clientesNuevosVsRecurrentesRows.map(r => ({
        mes:         r.mes,
        nuevos:      Number(r.nuevos),
        recurrentes: Number(r.recurrentes),
      })),
      distribucionGenero: distribucionGeneroRows.map(r => ({
        genero:   r.genero,
        cantidad: Number(r.cantidad),
      })),
      distribucionFormaPago: distribucionFormaPagoRows.map(r => ({
        formaPago: r.formaPago,
        cantidad:  Number(r.cantidad),
      })),
      totalClientes:  Number(cntClientes),
      ticketPromedio: parseFloat(avgTotal || 0),
    })
  } catch (error) {
    next(error)
  }
}

module.exports = { obtenerResumen, obtenerAnaliticas }
