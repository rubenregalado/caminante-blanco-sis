const { mysqlTable, int, varchar, text, decimal, datetime, timestamp } = require('drizzle-orm/mysql-core')
const { relations } = require('drizzle-orm')

const clientes = mysqlTable('clientes', {
  id:              int('id').primaryKey().autoincrement(),
  nombre:          varchar('nombre', { length: 150 }).notNull(),
  telefono:        varchar('telefono', { length: 20 }),
  nit:             varchar('nit', { length: 20 }),
  direccion:       text('direccion'),
  correo:          varchar('correo', { length: 150 }),
  genero:          varchar('genero', { length: 10 }),
  fechaNacimiento: datetime('fecha_nacimiento'),
  createdAt:       timestamp('created_at').defaultNow(),
})

const ordenes = mysqlTable('ordenes', {
  id:            int('id').primaryKey().autoincrement(),
  numeroOrden:   varchar('numero_orden', { length: 10 }).notNull().unique(),
  clienteId:     int('cliente_id').notNull(),
  fechaIngreso:  datetime('fecha_ingreso').notNull(),
  fechaEntrega:  datetime('fecha_entrega'),
  formaPago:     varchar('forma_pago', { length: 20 }),
  anticipo:      decimal('anticipo', { precision: 10, scale: 2 }).default('0'),
  total:         decimal('total', { precision: 10, scale: 2 }).default('0'),
  estado:        varchar('estado', { length: 20 }).default('pendiente').notNull(),
  notas:         text('notas'),
  urlFotos:      text('url_fotos'),
  urlFotosListo: text('url_fotos_listo'),
  createdAt:     timestamp('created_at').defaultNow(),
})

const itemsOrden = mysqlTable('items_orden', {
  id:            int('id').primaryKey().autoincrement(),
  ordenId:       int('orden_id').notNull(),
  tipoItem:      varchar('tipo_item', { length: 20 }).default('tenis').notNull(),
  servicio:      varchar('servicio', { length: 100 }),
  tipoZapato:    varchar('tipo_zapato', { length: 100 }),
  talla:         varchar('talla', { length: 10 }),
  marca:         varchar('marca', { length: 50 }),
  tipoAccesorio: varchar('tipo_accesorio', { length: 50 }),
  tamano:        varchar('tamano', { length: 50 }),
  color:         varchar('color', { length: 50 }),
  extras:        text('extras'),
  precio:        decimal('precio', { precision: 10, scale: 2 }).default('0'),
})

const notificaciones = mysqlTable('notificaciones', {
  id:        int('id').primaryKey().autoincrement(),
  ordenId:   int('orden_id').notNull(),
  tipo:      varchar('tipo', { length: 20 }).notNull(),
  mensaje:   text('mensaje').notNull(),
  enviadoAt: datetime('enviado_at'),
  estado:    varchar('estado', { length: 20 }).notNull(),
})

const clientesRelations = relations(clientes, ({ many }) => ({
  ordenes: many(ordenes),
}))

const ordenesRelations = relations(ordenes, ({ one, many }) => ({
  cliente:        one(clientes, { fields: [ordenes.clienteId], references: [clientes.id] }),
  items:          many(itemsOrden),
  notificaciones: many(notificaciones),
}))

const itemsOrdenRelations = relations(itemsOrden, ({ one }) => ({
  orden: one(ordenes, { fields: [itemsOrden.ordenId], references: [ordenes.id] }),
}))

const notificacionesRelations = relations(notificaciones, ({ one }) => ({
  orden: one(ordenes, { fields: [notificaciones.ordenId], references: [ordenes.id] }),
}))

module.exports = {
  clientes,
  ordenes,
  itemsOrden,
  notificaciones,
  clientesRelations,
  ordenesRelations,
  itemsOrdenRelations,
  notificacionesRelations,
}
