const prisma = require('../lib/prisma')

const obtenerResumen = async (req, res, next) => {
  try {
    const hoy = new Date()
    const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
    const finDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1)

    const [
      totalPendientes,
      totalEnProceso,
      totalListos,
      totalEntregados,
      ordenesHoy,
      proximasEntregas,
      ingresoHoy
    ] = await Promise.all([
      prisma.orden.count({ where: { estado: 'pendiente' } }),
      prisma.orden.count({ where: { estado: 'en_proceso' } }),
      prisma.orden.count({ where: { estado: 'listo' } }),
      prisma.orden.count({ where: { estado: 'entregado' } }),
      prisma.orden.findMany({
        where: { createdAt: { gte: inicioDia, lt: finDia } },
        include: { cliente: true },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      prisma.orden.findMany({
        where: {
          estado: { in: ['pendiente', 'en_proceso'] },
          fechaEntrega: {
            gte: inicioDia,
            lte: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 3)
          }
        },
        include: { cliente: true, items: true },
        orderBy: { fechaEntrega: 'asc' },
        take: 5
      }),
      prisma.orden.aggregate({
        where: {
          estado: 'entregado',
          createdAt: { gte: inicioDia, lt: finDia }
        },
        _sum: { total: true }
      })
    ])

    res.json({
      estados: {
        pendiente: totalPendientes,
        en_proceso: totalEnProceso,
        listo: totalListos,
        entregado: totalEntregados
      },
      ingresoHoy: ingresoHoy._sum.total || 0,
      ordenesHoy,
      proximasEntregas
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
      ingresosPorDia,
      ingresosPorSemana,
      ingresosPorMes,
      serviciosMasSolicitados,
      clientesNuevosVsRecurrentes,
      distribucionGenero,
      distribucionFormaPago,
      totalClientes,
      ticketData
    ] = await Promise.all([
      prisma.$queryRaw`
        SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS fecha,
               SUM(total) AS ingreso, COUNT(*) AS ordenes
        FROM ordenes
        WHERE estado = 'entregado' AND created_at >= ${hace30Dias}
        GROUP BY fecha ORDER BY fecha ASC
      `,
      prisma.$queryRaw`
        SELECT YEARWEEK(created_at, 1) AS semana,
               SUM(total) AS ingreso, COUNT(*) AS ordenes
        FROM ordenes
        WHERE estado = 'entregado' AND created_at >= ${hace84Dias}
        GROUP BY semana ORDER BY semana ASC
      `,
      prisma.$queryRaw`
        SELECT DATE_FORMAT(created_at, '%Y-%m') AS mes,
               SUM(total) AS ingreso, COUNT(*) AS ordenes
        FROM ordenes
        WHERE estado = 'entregado' AND created_at >= ${hace365Dias}
        GROUP BY mes ORDER BY mes ASC
      `,
      prisma.$queryRaw`
        SELECT servicio, COUNT(*) AS cantidad
        FROM items_orden
        WHERE servicio IS NOT NULL AND servicio != ''
        GROUP BY servicio ORDER BY cantidad DESC LIMIT 8
      `,
      prisma.$queryRaw`
        SELECT
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
          WHERE o.created_at >= ${hace12Meses}
        ) t
        GROUP BY mes
        ORDER BY mes ASC
      `,
      prisma.$queryRaw`
        SELECT COALESCE(genero, 'no_especificado') AS genero, COUNT(*) AS cantidad
        FROM clientes
        GROUP BY genero
      `,
      prisma.$queryRaw`
        SELECT forma_pago AS formaPago, COUNT(*) AS cantidad
        FROM ordenes
        WHERE forma_pago IS NOT NULL AND forma_pago != ''
        GROUP BY forma_pago ORDER BY cantidad DESC
      `,
      prisma.cliente.count(),
      prisma.orden.aggregate({
        where: { estado: 'entregado' },
        _avg: { total: true }
      })
    ])

    res.json({
      ingresosPorDia: ingresosPorDia.map(r => ({
        fecha: r.fecha,
        ingreso: Number(r.ingreso || 0),
        ordenes: Number(r.ordenes)
      })),
      ingresosPorSemana: ingresosPorSemana.map(r => ({
        semana: Number(r.semana),
        ingreso: Number(r.ingreso || 0),
        ordenes: Number(r.ordenes)
      })),
      ingresosPorMes: ingresosPorMes.map(r => ({
        mes: r.mes,
        ingreso: Number(r.ingreso || 0),
        ordenes: Number(r.ordenes)
      })),
      serviciosMasSolicitados: serviciosMasSolicitados.map(r => ({
        servicio: r.servicio,
        cantidad: Number(r.cantidad)
      })),
      clientesNuevosVsRecurrentes: clientesNuevosVsRecurrentes.map(r => ({
        mes: r.mes,
        nuevos: Number(r.nuevos),
        recurrentes: Number(r.recurrentes)
      })),
      distribucionGenero: distribucionGenero.map(r => ({
        genero: r.genero,
        cantidad: Number(r.cantidad)
      })),
      distribucionFormaPago: distribucionFormaPago.map(r => ({
        formaPago: r.formaPago,
        cantidad: Number(r.cantidad)
      })),
      totalClientes,
      ticketPromedio: Number(ticketData._avg.total || 0)
    })
  } catch (error) {
    next(error)
  }
}

module.exports = { obtenerResumen, obtenerAnaliticas }
