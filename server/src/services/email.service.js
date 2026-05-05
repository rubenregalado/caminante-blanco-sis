const { Resend } = require('resend')

const resend = new Resend(process.env.RESEND_API_KEY)

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

module.exports = { enviarCorreoOrdenRecibida, enviarCorreoListoParaRecoger }
