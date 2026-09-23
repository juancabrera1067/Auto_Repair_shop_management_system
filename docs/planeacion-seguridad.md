# Planeación de seguridad y modelo de datos del taller automotriz

Documento de continuidad | Fase de planeación previa al modelo SQL Server | 23 de septiembre de 2026

Este documento consolida las decisiones conceptuales tomadas después del diseño preliminar de la base de datos. Define cómo accederán el personal y los clientes, qué información podrá mostrar el portal, las entidades añadidas al modelo y el alcance de las primeras versiones. Es una especificación de planeación: los tipos SQL, restricciones e índices siguen pendientes de diseño.

## 1 Acceso y autenticación

El panel interno y el portal del cliente se separan por rutas y permisos. El personal inicia sesión con credenciales y sus acciones se autorizan en el servidor según su rol. Las interfaces pueden ocultar funciones, pero cada operación debe volver a comprobar la autorización en el backend.

| Área | Usuarios | Acceso propuesto |
|------|----------|------------------|
| Panel interno | Administrador, recepción y mecánico | Cuenta personal, contraseña protegida y permisos por rol |
| Seguimiento | Cliente de una orden específica | QR con token impredecible o folio y código de seguimiento |

En esta etapa no se requiere que cada cliente cree una cuenta. Un eventual acceso al historial completo mediante cuenta quedaría para una versión posterior.

## 2 Seguimiento mediante QR y código

Al crear una orden se entrega un folio visible, un código de seguimiento y un QR. El QR apunta a una dirección que incorpora un token aleatorio; no contiene placas, VIN, datos personales ni diagnóstico. La consulta manual requiere folio y código. El folio por sí solo no autoriza el acceso.

La tabla propuesta ACCESOS_SEGUIMIENTO vincula cada credencial temporal con una orden y registra identificador, hash del token, hash del código, creación, vencimiento, estado, último acceso e intentos fallidos. Se deben prever revocación, regeneración y límites a intentos repetidos. El acceso podría continuar un periodo configurable tras la entrega; el plazo exacto está por decidir.

Cada petición debe resolver la orden desde la credencial validada y limitar las consultas a ese OrdenServicioId. No se acepta un identificador enviado por el navegador como prueba de autorización para leer otra orden o sus archivos.

## 3 Contenido del portal y comunicación

El cliente verá vehículo, folio, estado simplificado, etapas del proceso y fecha de última actualización. Solo se publicarán textos y evidencias marcados para el cliente. Las notas de trabajo internas no se convierten automáticamente en mensajes públicos.

| Entidad propuesta | Contenido principal | Uso |
|-------------------|--------------------|-----|
| ACTUALIZACIONES_ORDEN | Orden, autor, título, mensaje, visibilidad y fecha | Cronología pública o interna |
| NOTIFICACIONES | Cliente, orden, tipo, título, mensaje, canal, estado y fechas | Registro de avisos dentro del sistema y por correo |
| EVIDENCIAS | Orden, tipo, referencia de archivo, descripción, visibilidad y autor | Fotos y archivos vinculados a una orden |

Eventos sugeridos para avisar: confirmación y proximidad de cita, recepción, diagnóstico concluido, cotización nueva o modificada, inicio de reparación, hallazgo adicional y vehículo listo. WhatsApp se plantea para una fase posterior.

## 4 Cotizaciones y autorización

Cada cotización conserva su versión. Una versión autorizada no se sobrescribe; cualquier cambio genera otra versión y mantiene el historial. La autorización señala exactamente la versión presentada al cliente. Los conceptos sin autorización permanecen registrados y no habilitan trabajos.

Para autorización parcial se propone DETALLE_AUTORIZACION con referencia a la autorización y al concepto de DETALLE_COTIZACION, indicador de aprobación y comentario. La implementación deberá definir cómo se tratan las dependencias entre conceptos, por ejemplo mano de obra asociada a una refacción, antes de habilitar la aprobación digital.

La autorización digital está prevista para la segunda versión. En el MVP, la autorización se registra desde el personal del taller con evidencia del consentimiento según el procedimiento que se determine.

## 5 Asignaciones y operación de órdenes

ASIGNACIONES_ORDEN vincula orden, usuario, fecha inicial y final, tipo de participación y vigencia. Permite registrar responsable y mecánicos de apoyo. La prioridad se representa mediante un catálogo PRIORIDADES_ORDEN con valores iniciales Normal, Alta y Urgente.

La orden registra ingreso, entrega estimada y entrega real. Estos datos permiten medir retrasos y duración de reparación. Las marcas y modelos permanecen como texto en VEHICULOS durante el MVP; un catálogo puede añadirse cuando haya una necesidad de normalización.

Clientes, vehículos, usuarios y servicios se desactivan para preservar sus relaciones históricas. Órdenes, cotizaciones, pagos y bitácoras se conservan. Un identificador interno es la clave de cada registro y el folio visible tiene una restricción de unicidad propia.

## 6 Relaciones del modelo actualizado

| Entidad principal | Relaciones relevantes |
|-------------------|-----------------------|
| CLIENTES | VEHICULOS, CITAS y NOTIFICACIONES |
| VEHICULOS | CITAS y ORDENES_SERVICIO |
| ORDENES_SERVICIO | RECEPCIONES, HISTORIAL_ESTADOS_ORDEN, DIAGNOSTICOS, COTIZACIONES, REPARACIONES, EVIDENCIAS, PRUEBAS_VEHICULO, PAGOS, ENTREGAS, ACCESOS_SEGUIMIENTO, ACTUALIZACIONES_ORDEN y ASIGNACIONES_ORDEN |
| COTIZACIONES | DETALLE_COTIZACION y AUTORIZACIONES; estas últimas con DETALLE_AUTORIZACION |
| USUARIOS | ROLES, BITACORA, ASIGNACIONES_ORDEN y acciones registradas en otras entidades |

Estas relaciones son conceptuales. Al especificar las claves foráneas se revisarán también redundancias, por ejemplo que una cita y su vehículo pertenezcan al mismo cliente y que un concepto aprobado corresponda a la cotización autorizada.

## 7 Alcance por versiones

| Versión | Funciones previstas |
|---------|--------------------|
| MVP | Inicio de sesión y roles básicos; clientes, vehículos, servicios y citas; recepción y checklist; órdenes y estados; diagnóstico, cotización, reparación, evidencias, pruebas y entrega; seguimiento por QR y código |
| Versión 2 | Autorización digital y parcial, pagos, avisos por correo, métricas y reportes avanzados, historial de cliente |
| Versión 3 | Inventario de refacciones, proveedores, compras, WhatsApp, facturación, sucursales y aplicación móvil |

El MVP permite demostrar una orden desde la recepción hasta la entrega. La regla comercial de pago previo a entrega, mencionada en el flujo anterior, deberá reconciliarse con esta división: si se exige cobrar antes de entregar desde el primer lanzamiento, pagos pasa al MVP.

## 8 Próxima fase de diseño

El siguiente entregable es el modelo de datos definitivo. Para cada tabla se especificarán propósito, columnas y tipos de SQL Server, PK, FK, nulabilidad, valores predeterminados, unicidad, restricciones CHECK, cardinalidad, índices y reglas de negocio. Después se podrá preparar el diagrama entidad relación y el script SQL.

### Decisiones que requieren cierre técnico

- Plazo de vigencia del QR y código después de la entrega, política de revocación y recuperación.
- Permisos exactos por rol y acciones reservadas al administrador.
- Reglas de transición entre estados, incluidos rechazos de pruebas y nuevas cotizaciones.
- Tratamiento de autorizaciones parciales y evidencia del consentimiento presencial o digital.
- Inclusión de pagos en el MVP si la entrega exige saldo liquidado.
- Política de archivos, tamaño permitido, acceso a evidencias y retención.
