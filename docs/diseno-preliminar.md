# Taller Automotriz — Diseño Preliminar de Base de Datos

Documento de planificación — Versión inicial

## 1. Objetivo

Este documento contiene el diseño preliminar de las entidades y relaciones identificadas para el sistema. No constituye todavía el script SQL definitivo; su finalidad es establecer una estructura coherente antes de implementar la base.

## 2. Agrupación de entidades

| Área | Entidades principales |
|------|---------------------|
| Seguridad | Usuarios, Roles, Bitácora |
| Clientes | Clientes, Vehículos |
| Agenda | Servicios, Citas, EstadosCita |
| Taller | ÓrdenesServicio, EstadosOrden, HistorialEstadosOrden, Recepciones, ChecklistItems, RecepcionChecklist |
| Diagnóstico | Diagnósticos, Fallas |
| Cotización | Cotizaciones, DetalleCotización, Autorizaciones |
| Reparación | Reparaciones, Evidencias, TiposEvidencia, PruebasVehículo |
| Finanzas | Pagos |
| Entrega | Entregas |

## 3. Entidades y campos preliminares

### ROLES

- RolId (PK)
- Nombre
- Descripcion
- Activo

### USUARIOS

- UsuarioId (PK)
- RolId (FK)
- Nombre
- Apellidos
- Correo
- Telefono
- Usuario
- PasswordHash
- Activo
- FechaRegistro
- UltimoAcceso

### CLIENTES

- ClienteId (PK)
- Nombre
- Apellidos
- Telefono
- Correo
- Direccion
- FechaRegistro
- Activo

### VEHICULOS

- VehiculoId (PK)
- ClienteId (FK)
- VIN
- Marca
- Modelo
- Anio
- Version
- Color
- Placas
- Combustible
- Transmision
- KilometrajeActual
- Observaciones
- FechaRegistro
- Activo

### SERVICIOS

- ServicioId (PK)
- Nombre
- Descripcion
- DuracionEstimada
- PrecioBase
- Activo

### ESTADOS_CITA

- EstadoCitaId (PK)
- Nombre
- Descripcion

### CITAS

- CitaId (PK)
- ClienteId (FK)
- VehiculoId (FK)
- ServicioId (FK)
- Fecha
- HoraInicio
- HoraFin
- Motivo
- Observaciones
- EstadoCitaId (FK)
- UsuarioRegistroId (FK)
- FechaRegistro

### ESTADOS_ORDEN

- EstadoOrdenId (PK)
- Nombre
- Descripcion
- OrdenVisual
- VisibleCliente
- Activo

### ORDENES_SERVICIO

- OrdenServicioId (PK)
- Folio
- VehiculoId (FK)
- CitaId (FK)
- UsuarioRecepcionId (FK)
- FechaIngreso
- FechaEstimadaEntrega
- FechaEntrega
- KilometrajeEntrada
- KilometrajeSalida
- EstadoOrdenId (FK)
- MotivoIngreso
- Observaciones
- FechaCreacion

### HISTORIAL_ESTADOS_ORDEN

- HistorialId (PK)
- OrdenServicioId (FK)
- EstadoAnteriorId (FK)
- EstadoNuevoId (FK)
- UsuarioId (FK)
- FechaCambio
- Comentario

### RECEPCIONES

- RecepcionId (PK)
- OrdenServicioId (FK)
- NivelCombustible
- Kilometraje
- LlavesCantidad
- LlantaRefaccion
- Gato
- Herramientas
- ObjetosPersonales
- Observaciones
- FechaRecepcion
- UsuarioId (FK)

### CHECKLIST_ITEMS

- ChecklistItemId (PK)
- Nombre
- Categoria
- Activo

### RECEPCION_CHECKLIST

- RecepcionChecklistId (PK)
- RecepcionId (FK)
- ChecklistItemId (FK)
- Estado
- Observaciones

### DIAGNOSTICOS

- DiagnosticoId (PK)
- OrdenServicioId (FK)
- UsuarioId (FK)
- Fecha
- Descripcion
- Causa
- Recomendacion
- Observaciones
- Estado

### FALLAS

- FallaId (PK)
- DiagnosticoId (FK)
- Descripcion
- Tipo
- Prioridad
- Observaciones

### COTIZACIONES

- CotizacionId (PK)
- OrdenServicioId (FK)
- Folio
- Version
- FechaCreacion
- Subtotal
- IVA
- Descuento
- Total
- EstadoCotizacionId (FK)
- UsuarioId (FK)
- FechaVencimiento
- Observaciones

### DETALLE_COTIZACION

- DetalleCotizacionId (PK)
- CotizacionId (FK)
- Tipo
- Descripcion
- Cantidad
- PrecioUnitario
- Descuento
- Subtotal
- FallaId (FK, opcional)

### AUTORIZACIONES

- AutorizacionId (PK)
- CotizacionId (FK)
- ClienteId (FK)
- Fecha
- Tipo
- Estado
- Comentario
- IP

### REPARACIONES

- ReparacionId (PK)
- OrdenServicioId (FK)
- FallaId (FK, opcional)
- UsuarioAsignadoId (FK)
- Descripcion
- FechaInicio
- FechaFin
- Estado
- Observaciones

### EVIDENCIAS

- EvidenciaId (PK)
- OrdenServicioId (FK)
- TipoEvidenciaId (FK)
- Archivo
- Descripcion
- VisibleCliente
- FechaRegistro
- UsuarioId (FK)

### PRUEBAS_VEHICULO

- PruebaId (PK)
- OrdenServicioId (FK)
- UsuarioId (FK)
- Fecha
- Tipo
- Resultado
- Descripcion
- Observaciones

### PAGOS

- PagoId (PK)
- OrdenServicioId (FK)
- Monto
- MetodoPago
- Referencia
- FechaPago
- UsuarioId (FK)
- Observaciones

### ENTREGAS

- EntregaId (PK)
- OrdenServicioId (FK)
- FechaEntrega
- HoraEntrega
- KilometrajeSalida
- UsuarioId (FK)
- Observaciones
- ConformidadCliente

### BITACORA

- BitacoraId (PK)
- UsuarioId (FK)
- Accion
- Modulo
- RegistroId
- Fecha
- IP
- Descripcion

## 4. Relaciones principales

| Entidad A | Cardinalidad | Entidad B | Descripción |
|-----------|-------------|-----------|-------------|
| Roles | 1:N | Usuarios | Un rol puede estar asignado a múltiples usuarios. |
| Clientes | 1:N | Vehículos | Un cliente puede registrar varios vehículos. |
| Clientes | 1:N | Citas | Un cliente puede solicitar múltiples citas. |
| Vehículos | 1:N | Citas | Un vehículo puede tener múltiples citas. |
| Servicios | 1:N | Citas | Un servicio puede ser solicitado en múltiples citas. |
| Vehículos | 1:N | Órdenes de servicio | Un vehículo puede tener múltiples servicios a lo largo del tiempo. |
| Órdenes de servicio | 1:N | Historial de estados | Cada cambio de estado genera un registro histórico. |
| Órdenes de servicio | 1:N | Diagnósticos | Una orden puede tener uno o varios registros de diagnóstico. |
| Diagnósticos | 1:N | Fallas | Un diagnóstico puede identificar varias fallas. |
| Órdenes de servicio | 1:N | Cotizaciones | Se pueden conservar varias versiones. |
| Cotizaciones | 1:N | Detalle de cotización | Una cotización contiene múltiples conceptos. |
| Cotizaciones | 1:N | Autorizaciones | Se conserva la trazabilidad de las autorizaciones. |
| Órdenes de servicio | 1:N | Reparaciones | Una orden puede contener varios trabajos. |
| Órdenes de servicio | 1:N | Evidencias | Una orden puede tener múltiples fotografías/archivos. |
| Órdenes de servicio | 1:N | Pruebas | Una orden puede tener varias pruebas. |
| Órdenes de servicio | 1:N | Pagos | Una orden puede recibir pagos parciales. |
| Órdenes de servicio | 1:1 | Entrega | Una orden completada tendrá su registro de entrega. |

## 5. Reglas de integridad propuestas

- VIN deberá ser único cuando el dato exista.
- Las relaciones deberán utilizar claves foráneas.
- No se deberán eliminar físicamente registros históricos críticos; se priorizará un campo Activo o un estado cuando corresponda.
- Una orden de servicio debe pertenecer a un vehículo.
- Una cita puede estar vinculada a una orden cuando se convierte en servicio.
- Los cambios de estado deberán registrarse en HistorialEstadosOrden.
- Una cotización autorizada no debe perder sus datos originales al generarse una nueva versión.
- Los pagos deberán asociarse a una orden de servicio.
- Las evidencias deberán indicar si pueden ser visibles para el cliente.
- Las contraseñas deberán almacenarse mediante hash seguro, nunca como texto plano.

## 6. Índices y restricciones a considerar

- Índice/UNIQUE para VIN.
- Índice para placas.
- Índice para Folio de orden.
- Índices para búsquedas por ClienteId, VehiculoId y EstadoOrdenId.
- Índices para Fecha de citas y FechaIngreso de órdenes.
- Índices para historial por OrdenServicioId y FechaCambio.
- Restricciones CHECK para cantidades y montos no negativos.
- Restricciones de fechas cuando sea necesario.
- Reglas para impedir inconsistencias de autorización, pago y entrega.

## 7. Consideraciones para archivos

Las fotografías y documentos no deberían almacenarse directamente dentro de SQL Server salvo que exista una razón específica para hacerlo. Una estrategia inicial es almacenar los archivos en almacenamiento del servidor o servicio externo y conservar en EVIDENCIAS la referencia, metadatos y permisos de visibilidad.

## 8. Diseño de seguridad pendiente

- Definir autenticación de administradores y personal.
- Definir autenticación del cliente.
- Determinar si el acceso del cliente será por cuenta, folio + código, QR o combinación.
- Garantizar aislamiento por ClienteId/VehiculoId/OrdenServicioId.
- Definir permisos por rol.
- Definir expiración y revocación de códigos de acceso.
- Definir auditoría de acciones sensibles.

## 9. Próximo paso de base de datos

El siguiente documento técnico deberá convertir este modelo preliminar en un modelo entidad-relación formal y posteriormente en un script SQL Server completo, con tipos de datos, PK, FK, UNIQUE, CHECK, índices, datos iniciales, procedimientos almacenados cuando sean necesarios y reglas de negocio.
