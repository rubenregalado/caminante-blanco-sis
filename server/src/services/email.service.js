const { Resend } = require('resend')

const resend = new Resend(process.env.RESEND_API_KEY)

const pieCorreo = `
  <p style="margin-top:32px; padding-top:16px; border-top:1px solid #e5e7eb; text-align:center; font-size:11px; color:#9ca3af;">
    Desarrollado por
    <a href="https://www.scada.com.gt" style="color:#9ca3af; text-decoration:none;">SCADA S.A. Guatemala</a>
    &nbsp;·&nbsp; www.scada.com.gt
  </p>
`

// ─── Correo 1: Orden recibida ─────────────────────────────────────────────────
async function enviarCorreoOrdenRecibida(orden) {
  const fecha = new Date(orden.fechaIngreso).toLocaleDateString('es-GT', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
  const fechaEntrega = orden.fechaEntrega
    ? new Date(orden.fechaEntrega).toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'Por confirmar'

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1d4ed8;">Caminante Blanco</h2>
      <p>Hola <strong>${orden.cliente.nombre}</strong>,</p>
      <p>Hemos recibido tus tenis correctamente. Aquí el resumen de tu orden:</p>
      <table style="width:100%; border-collapse:collapse; margin: 20px 0;">
        <tr>
          <td style="padding:8px; border-bottom:1px solid #e5e7eb;">🔖 No. de orden</td>
          <td style="padding:8px; border-bottom:1px solid #e5e7eb;"><strong>${orden.numeroOrden}</strong></td>
        </tr>
        <tr>
          <td style="padding:8px; border-bottom:1px solid #e5e7eb;">📅 Fecha de ingreso</td>
          <td style="padding:8px; border-bottom:1px solid #e5e7eb;"><strong>${fecha}</strong></td>
        </tr>
        <tr>
          <td style="padding:8px; border-bottom:1px solid #e5e7eb;">🗓️ Fecha estimada de entrega</td>
          <td style="padding:8px; border-bottom:1px solid #e5e7eb;"><strong>${fechaEntrega}</strong></td>
        </tr>
        <tr>
          <td style="padding:8px; border-bottom:1px solid #e5e7eb;">💰 Total</td>
          <td style="padding:8px; border-bottom:1px solid #e5e7eb;"><strong>Q${parseFloat(orden.total).toFixed(2)}</strong></td>
        </tr>
        <tr>
          <td style="padding:8px;">💳 Anticipo recibido</td>
          <td style="padding:8px;"><strong>Q${parseFloat(orden.anticipo).toFixed(2)}</strong></td>
        </tr>
      </table>
      <p style="color:#6b7280; font-size:14px;">Te avisaremos por correo cuando tus tenis estén listos para recoger.</p>
      <div style="background:#f0f9ff; padding:16px; border-radius:8px; margin-top:20px;">
        <p style="margin:0;">📍 <strong>Dirección:</strong><br>8va. Ave. Calzada 2 Hector Zona 2, Chiquimula, Guatemala</p>
        <p style="margin:8px 0 0;">📞 <strong>Teléfono:</strong> 5747-5054</p>
        <p style="margin:8px 0 0;">📸 <strong>Instagram:</strong> @caminanteblancog</p>
      </div>
      <p style="margin-top:24px;">¡Gracias por confiar en <strong>Caminante Blanco</strong>!</p>
      ${pieCorreo}
    </div>
  `

  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM,
    to: orden.cliente.correo,
    subject: `Orden recibida No. ${orden.numeroOrden} - Caminante Blanco`,
    html
  })

  if (error) throw new Error(error.message)
  return data
}

// ─── Correo 2: Tenis listos para recoger ─────────────────────────────────────
async function enviarCorreoListoParaRecoger(orden) {
  const saldo = (parseFloat(orden.total) - parseFloat(orden.anticipo)).toFixed(2)
  const fecha = new Date().toLocaleDateString('es-GT', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1d4ed8;">Caminante Blanco</h2>
      <p>Hola <strong>${orden.cliente.nombre}</strong>,</p>
      <p>✅ Tus tenis de la orden <strong>No. ${orden.numeroOrden}</strong> ya están listos para recoger.</p>
      <table style="width:100%; border-collapse:collapse; margin: 20px 0;">
        <tr>
          <td style="padding:8px; border-bottom:1px solid #e5e7eb;">📅 Fecha</td>
          <td style="padding:8px; border-bottom:1px solid #e5e7eb;"><strong>${fecha}</strong></td>
        </tr>
        <tr>
          <td style="padding:8px; border-bottom:1px solid #e5e7eb;">💰 Saldo pendiente</td>
          <td style="padding:8px; border-bottom:1px solid #e5e7eb;"><strong>Q${saldo}</strong></td>
        </tr>
        <tr>
          <td style="padding:8px;">💳 Forma de pago acordada</td>
          <td style="padding:8px;"><strong>${orden.formaPago || 'efectivo'}</strong></td>
        </tr>
      </table>
      <div style="background:#f0f9ff; padding:16px; border-radius:8px; margin-top:20px;">
        <p style="margin:0;">📍 <strong>Dirección:</strong><br>8va. Ave. Calzada 2 Hector Zona 2, Chiquimula, Guatemala</p>
        <p style="margin:8px 0 0;">📞 <strong>Teléfono:</strong> 5747-5054</p>
        <p style="margin:8px 0 0;">📸 <strong>Instagram:</strong> @caminanteblancog</p>
      </div>
      <p style="margin-top:24px;">¡Gracias por confiar en <strong>Caminante Blanco</strong>!</p>
      ${pieCorreo}
    </div>
  `

  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM,
    to: orden.cliente.correo,
    subject: `Tus tenis están listos - Caminante Blanco`,
    html
  })

  if (error) throw new Error(error.message)
  return data
}

// ─── Correo 3: Artículos express listos (entrega parcial) ────────────────────
async function enviarCorreoExpressListo(orden) {
  const saldo = (parseFloat(orden.total) - parseFloat(orden.anticipo)).toFixed(2)
  const fecha = new Date().toLocaleDateString('es-GT', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
  const fechaEntrega = orden.fechaEntrega
    ? new Date(orden.fechaEntrega).toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'la fecha estimada'

  // Contar items express
  const itemsExpress = orden.items?.filter(item => 
    item.servicio?.toLowerCase().includes('express')
  ) || []
  const itemsNormales = orden.items?.filter(item => 
    !item.servicio?.toLowerCase().includes('express')
  ) || []

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1d4ed8;">Caminante Blanco</h2>
      <p>Hola <strong>${orden.cliente.nombre}</strong>,</p>
      <p>⚡ Tus <strong>artículos express</strong> de la orden <strong>No. ${orden.numeroOrden}</strong> ya están listos para recoger.</p>
      
      <div style="background:#fff5f5; border-left:4px solid #ef4444; padding:12px 16px; margin:20px 0; border-radius:4px;">
        <p style="margin:0; font-size:14px; color:#991b1b;">
          <strong>⏰ Servicio Express:</strong> ${itemsExpress.length} artículo(s) listo(s) para recoger hoy
        </p>
      </div>

      ${itemsNormales.length > 0 ? `
      <div style="background:#f0f9ff; border-left:4px solid #3b82f6; padding:12px 16px; margin:20px 0; border-radius:4px;">
        <p style="margin:0; font-size:14px; color:#1e40af;">
          <strong>📅 Servicio Regular:</strong> ${itemsNormales.length} artículo(s) restante(s) estarán listos el <strong>${fechaEntrega}</strong>
        </p>
      </div>
      ` : ''}

      <table style="width:100%; border-collapse:collapse; margin: 20px 0;">
        <tr>
          <td style="padding:8px; border-bottom:1px solid #e5e7eb;">📅 Fecha</td>
          <td style="padding:8px; border-bottom:1px solid #e5e7eb;"><strong>${fecha}</strong></td>
        </tr>
        <tr>
          <td style="padding:8px; border-bottom:1px solid #e5e7eb;">💰 Total de la orden</td>
          <td style="padding:8px; border-bottom:1px solid #e5e7eb;"><strong>Q${parseFloat(orden.total).toFixed(2)}</strong></td>
        </tr>
        <tr>
          <td style="padding:8px; border-bottom:1px solid #e5e7eb;">💰 Saldo pendiente</td>
          <td style="padding:8px; border-bottom:1px solid #e5e7eb;"><strong>Q${saldo}</strong></td>
        </tr>
        <tr>
          <td style="padding:8px;">💳 Forma de pago acordada</td>
          <td style="padding:8px;"><strong>${orden.formaPago || 'efectivo'}</strong></td>
        </tr>
      </table>

      <p style="color:#6b7280; font-size:14px;">
        ${itemsNormales.length > 0 
          ? 'Te notificaremos nuevamente cuando el resto de tus artículos esté listo.' 
          : 'Puedes pasar a recoger cuando gustes.'}
      </p>

      <div style="background:#f0f9ff; padding:16px; border-radius:8px; margin-top:20px;">
        <p style="margin:0;">📍 <strong>Dirección:</strong><br>8va. Ave. Calzada 2 Hector Zona 2, Chiquimula, Guatemala</p>
        <p style="margin:8px 0 0;">📞 <strong>Teléfono:</strong> 5747-5054</p>
        <p style="margin:8px 0 0;">📸 <strong>Instagram:</strong> @caminanteblancog</p>
      </div>
      <p style="margin-top:24px;">¡Gracias por confiar en <strong>Caminante Blanco</strong>!</p>
      ${pieCorreo}
    </div>
  `

  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM,
    to: orden.cliente.correo,
    subject: `⚡ Artículos express listos - Orden ${orden.numeroOrden} - Caminante Blanco`,
    html
  })

  if (error) throw new Error(error.message)
  return data
}

// ─── Correo 4: Felicitación de cumpleaños ────────────────────────────────────
async function enviarCorreoCumpleanos(cliente) {
  const nombre = cliente.nombre.split(' ')[0] // solo primer nombre

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; padding: 32px 20px; background: linear-gradient(135deg, #3B30D0 0%, #5b52e0 100%); border-radius: 16px; margin-bottom: 24px;">
        <p style="font-size: 48px; margin: 0;">🎂</p>
        <h1 style="color: #ffffff; margin: 12px 0 4px; font-size: 28px;">¡Feliz Cumpleaños!</h1>
        <p style="color: #c7c3f5; margin: 0; font-size: 16px;">${cliente.nombre}</p>
      </div>

      <p style="font-size: 16px; color: #374151;">Hola <strong>${nombre}</strong>,</p>
      <p style="font-size: 15px; color: #374151; line-height: 1.6;">
        Todo el equipo de <strong>Caminante Blanco</strong> te desea un día lleno de alegría, celebración y todo lo que mereces.
        ¡Que este nuevo año de vida venga cargado de bendiciones!
      </p>

      <div style="background: #f0eeff; border-left: 4px solid #3B30D0; padding: 16px 20px; border-radius: 8px; margin: 24px 0;">
        <p style="margin: 0; color: #3B30D0; font-size: 15px; font-weight: bold;">
          Gracias por ser parte de nuestra familia.
        </p>
        <p style="margin: 8px 0 0; color: #5b52e0; font-size: 14px;">
          Es un placer cuidar tus zapatos y accesorios en tu día especial.
        </p>
      </div>

      <div style="background:#f9fafb; padding:16px; border-radius:8px; margin-top:20px;">
        <p style="margin:0; color:#6b7280; font-size:13px;">📍 <strong>Dirección:</strong> 8va. Ave. Calzada 2 Hector Zona 2, Chiquimula, Guatemala</p>
        <p style="margin:8px 0 0; color:#6b7280; font-size:13px;">📞 <strong>Teléfono:</strong> 5747-5054</p>
        <p style="margin:8px 0 0; color:#6b7280; font-size:13px;">📸 <strong>Instagram:</strong> @caminanteblancog</p>
      </div>

      <p style="margin-top: 24px; color: #374151;">
        Con cariño,<br/>
        <strong>Equipo Caminante Blanco</strong>
      </p>
      ${pieCorreo}
    </div>
  `

  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM,
    to: cliente.correo,
    subject: `¡Feliz Cumpleaños ${nombre}! - Caminante Blanco`,
    html,
  })

  if (error) throw new Error(error.message)
  return data
}

module.exports = { enviarCorreoOrdenRecibida, enviarCorreoListoParaRecoger, enviarCorreoExpressListo, enviarCorreoCumpleanos }
