const { db, pool } = require('../lib/db')
const { clientes, ordenes } = require('../lib/schema')
const { eq, and, or, gte, lt, lte, asc, desc, inArray, count, sum, avg } = require('drizzle-orm')
const { findOrdenes } = require('../lib/helpers')
const { hoyEnNegocio, rangoDelDia, ES_FECHA_ISO } = require('../utils/fechas')

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
    // El día se corta a medianoche de Guatemala para que coincida con el cierre
    // diario, aunque el servidor corra en otra zona horaria.
    const { inicio: inicioDia, fin: finDia } = rangoDelDia(hoyEnNegocio())
    const tresDias  = new Date(inicioDia.getTime() + 3 * 24 * 60 * 60 * 1000)
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
      caja,
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
      calcularCajaDelDia(hoyEnNegocio()),
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
      cajaHoy: {
        totalCobrado:       caja.totales.total,
        totalEfectivo:      caja.totales.efectivo,
        totalTransferencia: caja.totales.transferencia,
        totalTarjeta:       caja.totales.tarjeta,
        ordenesEntregadas:  caja.conteo.saldos,
        ordenesConAnticipo: caja.conteo.anticipos,
        // Estado del cajón: lo que había al abrir, lo que debería haber ahora, y
        // el cierre del día si ya se registró.
        saldoInicial:       caja.saldoInicial,
        saldoInicialDesde:  caja.saldoInicialDesde,
        efectivoEnCaja:     caja.efectivoEnCaja,
        cierre:             caja.cierre,
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

// Estado de la caja en un día: cuánto había al abrir, cuánto entró y cuánto
// debería haber ahora. Cada movimiento es una entrada real de dinero — un
// anticipo cobrado al recibir la orden, o un pago recibido al entregarla. Una
// orden puede aparecer dos veces (anticipo un día, saldo otro) y eso es correcto.
//
// Lo usan tanto el dashboard como el modal de cierre, para que el número que se
// ve durante el día y el que se cuadra al cerrar salgan del mismo cálculo.
async function calcularCajaDelDia(fecha) {
  {
    const { inicio, fin } = rangoDelDia(fecha)

    // Un pago al entregar puede repartirse entre varios métodos, así que se
    // desglosa en un movimiento por método con monto mayor a cero.
    const [movimientosRows] = await pool.promise().query(
      `SELECT * FROM (
         SELECT 'anticipo' AS tipo, o.numero_orden, c.nombre AS cliente,
                o.forma_pago AS metodo, o.anticipo AS monto, o.created_at AS momento
         FROM ordenes o JOIN clientes c ON c.id = o.cliente_id
         WHERE o.anticipo > 0 AND o.created_at >= ? AND o.created_at < ?

         UNION ALL
         SELECT 'saldo', o.numero_orden, c.nombre, 'efectivo', o.pago_efectivo, o.fecha_entregado
         FROM ordenes o JOIN clientes c ON c.id = o.cliente_id
         WHERE o.estado = 'entregado' AND o.pago_efectivo > 0
           AND o.fecha_entregado >= ? AND o.fecha_entregado < ?

         UNION ALL
         SELECT 'saldo', o.numero_orden, c.nombre, 'transferencia', o.pago_transferencia, o.fecha_entregado
         FROM ordenes o JOIN clientes c ON c.id = o.cliente_id
         WHERE o.estado = 'entregado' AND o.pago_transferencia > 0
           AND o.fecha_entregado >= ? AND o.fecha_entregado < ?

         UNION ALL
         SELECT 'saldo', o.numero_orden, c.nombre, 'tarjeta', o.pago_tarjeta, o.fecha_entregado
         FROM ordenes o JOIN clientes c ON c.id = o.cliente_id
         WHERE o.estado = 'entregado' AND o.pago_tarjeta > 0
           AND o.fecha_entregado >= ? AND o.fecha_entregado < ?
       ) AS movimientos
       ORDER BY momento ASC`,
      [inicio, fin, inicio, fin, inicio, fin, inicio, fin]
    )

    const movimientos = movimientosRows.map(m => ({
      tipo:        m.tipo,
      numeroOrden: m.numero_orden,
      cliente:     m.cliente,
      metodo:      m.metodo || 'efectivo',
      monto:       parseFloat(m.monto || 0),
      momento:     m.momento,
    }))

    // Los totales se derivan del detalle para que nunca puedan discrepar de la
    // lista que ve el usuario al cuadrar.
    const acumular = (filtro) =>
      movimientos.filter(filtro).reduce((s, m) => s + m.monto, 0)

    const efectivo      = acumular(m => m.metodo === 'efectivo')
    const transferencia = acumular(m => m.metodo === 'transferencia')
    const tarjeta       = acumular(m => m.metodo === 'tarjeta')

    const [[cierreGuardado], [cierreAnterior]] = await Promise.all([
      pool.promise()
        .query(`SELECT caja_chica, notas, updated_at FROM cierres_caja WHERE fecha = ?`, [fecha])
        .then(([r]) => [r[0] || null]),
      // El último cierre anterior, no necesariamente el de ayer: si el negocio
      // no abrió el domingo, el saldo inicial del lunes viene del sábado.
      // DATE_FORMAT y no la columna cruda: mysql2 convierte DATE a un Date de
      // JS con hora, y al serializarlo podría cambiar de día.
      pool.promise()
        .query(
          `SELECT DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha, caja_chica
           FROM cierres_caja WHERE fecha < ? ORDER BY fecha DESC LIMIT 1`,
          [fecha]
        )
        .then(([r]) => [r[0] || null]),
    ])

    const saldoInicial   = parseFloat(cierreAnterior?.caja_chica || 0)
    const efectivoEnCaja = saldoInicial + efectivo

    // Se cuentan órdenes distintas y no filas: un pago repartido entre efectivo
    // y tarjeta son dos movimientos, pero una sola entrega.
    const ordenesDistintas = (tipo) =>
      new Set(movimientos.filter(m => m.tipo === tipo).map(m => m.numeroOrden)).size

    return {
      fecha,
      totales: {
        efectivo,
        transferencia,
        tarjeta,
        total: efectivo + transferencia + tarjeta,
      },
      // Lo que debe estar físicamente en el cajón: el saldo que quedó del cierre
      // anterior más el efectivo de hoy. Transferencias y tarjeta van al banco.
      saldoInicial,
      efectivoEnCaja,
      saldoInicialDesde: cierreAnterior?.fecha || null,
      cierre: cierreGuardado
        ? {
            cajaChica:   parseFloat(cierreGuardado.caja_chica || 0),
            notas:       cierreGuardado.notas || '',
            actualizado: cierreGuardado.updated_at,
            // Lo que se saca del cajón: todo menos lo que se deja para mañana.
            aRetirar:    Math.max(0, efectivoEnCaja - parseFloat(cierreGuardado.caja_chica || 0)),
          }
        : null,
      conteo: {
        movimientos: movimientos.length,
        anticipos:   ordenesDistintas('anticipo'),
        saldos:      ordenesDistintas('saldo'),
      },
      movimientos,
    }
  }
}

const obtenerCierreDiario = async (req, res, next) => {
  try {
    const fecha = req.query.fecha || hoyEnNegocio()

    if (!ES_FECHA_ISO.test(fecha)) {
      return res.status(400).json({ mensaje: 'La fecha debe tener el formato YYYY-MM-DD' })
    }

    res.json(await calcularCajaDelDia(fecha))
  } catch (error) {
    next(error)
  }
}

// Registra (o corrige) el cierre de un día. Se puede volver a guardar el mismo
// día para ajustar el monto sin crear un registro duplicado.
const guardarCierreDiario = async (req, res, next) => {
  try {
    const fecha = req.body.fecha || hoyEnNegocio()
    const { cajaChica, notas } = req.body

    if (!ES_FECHA_ISO.test(fecha)) {
      return res.status(400).json({ mensaje: 'La fecha debe tener el formato YYYY-MM-DD' })
    }

    const monto = parseFloat(cajaChica)

    if (!Number.isFinite(monto) || monto < 0) {
      return res.status(400).json({ mensaje: 'El monto de caja chica debe ser un número mayor o igual a cero' })
    }

    await pool.promise().query(
      `INSERT INTO cierres_caja (fecha, caja_chica, notas) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE caja_chica = VALUES(caja_chica), notas = VALUES(notas)`,
      [fecha, monto, notas || null]
    )

    res.json({ mensaje: 'Cierre guardado', fecha, cajaChica: monto })
  } catch (error) {
    next(error)
  }
}

module.exports = { obtenerResumen, obtenerAnaliticas, obtenerCierreDiario, guardarCierreDiario }
