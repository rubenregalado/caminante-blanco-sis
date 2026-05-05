# Configuración de envío de correos (Resend)

El sistema usa **Resend** para enviar correos automáticos al cliente cuando una orden cambia a estado **"Listo"**. Resend es más confiable que Gmail SMTP y no requiere configuraciones especiales de seguridad en la cuenta.

---

## Lo que ya está hecho en el código

- SDK de Resend instalado (`npm install resend` ejecutado en `/server`)
- `email.service.js` migrado completamente a Resend
- Variables de entorno en `.env` preparadas con nombres correctos:
  - `RESEND_API_KEY` — clave de API de Resend
  - `RESEND_FROM` — dirección de remitente

Solo falta crear la cuenta, obtener la API key y (opcionalmente) verificar un dominio propio.

---

## Paso 1 — Crear cuenta en Resend

1. Ve a [resend.com](https://resend.com) y haz clic en **Sign Up**
2. Puedes registrarte con GitHub o con correo
3. Confirma tu correo si te pide verificación

---

## Paso 2 — Obtener la API Key

1. Dentro del dashboard de Resend, ve al menú **API Keys**
2. Haz clic en **Create API Key**
3. Dale un nombre: `caminante-blanco-production`
4. Permisos: **Full access** (o "Sending access" es suficiente)
5. Copia la clave generada — empieza con `re_`

> Guárdala de inmediato, Resend no la vuelve a mostrar completa.

---

## Paso 3 — Actualizar el archivo `.env`

Abre el archivo `.env` en la raíz del proyecto y reemplaza los valores:

```env
RESEND_API_KEY=re_TuClaveRealAqui
RESEND_FROM="Caminante Blanco <onboarding@resend.dev>"
```

> **Mientras no tengas dominio propio verificado**, usa `onboarding@resend.dev` como remitente. Solo podrás enviar correos a la dirección con la que te registraste en Resend (útil para pruebas).

---

## Paso 4 — (Opcional pero recomendado) Verificar un dominio propio

Para enviar correos a cualquier destinatario en producción, necesitas un dominio verificado.

### Si tienes dominio en Hostinger:

1. En Resend ve a **Domains → Add Domain**
2. Ingresa tu dominio (ej: `caminanteblanco.com`)
3. Resend te mostrará registros DNS que debes agregar (tipo TXT y MX)
4. En el panel de Hostinger → **Zona DNS** → agrega cada registro que Resend indica
5. Espera entre 5 y 30 minutos para que propaguen
6. Haz clic en **Verify** en Resend

Una vez verificado, actualiza `RESEND_FROM` en el `.env`:

```env
RESEND_FROM="Caminante Blanco <notificaciones@tucorreodominio.com>"
```

---

## Paso 5 — Reiniciar el servidor

Después de guardar el `.env`, reinicia el servidor para que tome los nuevos valores:

```bash
# Detener con Ctrl+C, luego:
npm run dev
```

---

## Configuración en Hostinger (producción)

Al desplegar en Hostinger, las variables del `.env` **no se suben al repositorio** (están en `.gitignore`). Debes agregarlas manualmente en el panel de Hostinger:

1. Ve a tu cuenta de Hostinger → **Hosting** → **Aplicaciones Node.js**
2. Selecciona tu aplicación Caminante Blanco
3. Ve a la sección **Variables de entorno** o **Environment Variables**
4. Agrega las siguientes variables una por una:

| Variable | Valor |
|----------|-------|
| `RESEND_API_KEY` | `re_TuClaveReal` |
| `RESEND_FROM` | `Caminante Blanco <notificaciones@tudominio.com>` |
| `DATABASE_URL` | `mysql://u632233585_caminante:TU_PASSWORD@localhost:3306/u632233585_caminante` |
| `ADMIN_USER` | `admin` |
| `ADMIN_PASSWORD` | Tu contraseña de administrador |
| `JWT_SECRET` | Tu clave JWT secreta (mínimo 32 caracteres) |
| `JWT_EXPIRES_IN` | `7d` |
| `NODE_ENV` | `production` |
| `PORT` | `3001` (o el puerto que use Hostinger) |

5. Guarda los cambios y reinicia la aplicación desde el panel de Hostinger

---

## Verificación

Para confirmar que funciona:

1. Crea una orden con un cliente que tenga correo registrado
2. Cambia el estado de la orden a **"Listo"**
3. El sistema enviará el correo automáticamente
4. El historial de notificaciones dentro de la orden mostrará si fue enviado o falló

También puedes revisar en el dashboard de Resend → **Emails** para ver el log completo de cada correo enviado.

---

## Solución de problemas

| Error | Causa | Solución |
|-------|-------|----------|
| `API key is invalid` | `RESEND_API_KEY` incorrecto o no configurado | Verificar el valor en `.env` local o en las variables de entorno de Hostinger |
| `You can only send testing emails to your own email address` | No hay dominio verificado | Verificar un dominio en Resend o usar solo tu propio correo para pruebas |
| `The gmail.com domain is not verified` | Se usó `@gmail.com` como remitente sin verificar | Usar `onboarding@resend.dev` o verificar un dominio propio |
| El correo no llega | Correo del cliente incorrecto | Revisar el correo registrado en el perfil del cliente |
| Error de conexión en producción | Variables de entorno no configuradas en Hostinger | Verificar que todas las variables estén en el panel de Hostinger |
