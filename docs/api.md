# API del taller

Todas las rutas usan JSON salvo la carga de evidencias. El personal inicia sesión mediante cookie; el portal usa otra cookie. La API devuelve errores con código HTTP y `detail`; las validaciones de modelo incluyen `errors`.

Antes de un POST o PUT, obtener `GET /api/auth/csrf`, conservar las cookies y enviar el valor `token` en `X-CSRF-TOKEN`. Renovar ese token después de iniciar/cerrar sesión o cambiar contraseña. Los GET no alteran datos operativos.

## Autenticación y configuración

| Método | Ruta | Uso |
| --- | --- | --- |
| GET | `/api/auth/csrf` | Token antifalsificación |
| GET | `/api/auth/session` | Sesión y disponibilidad de configuración inicial |
| POST | `/api/auth/setup` | Primer administrador, solo Development + loopback + base sin usuarios |
| POST | `/api/auth/login` | Correo y contraseña |
| POST | `/api/auth/logout` | Cerrar sesión |
| POST | `/api/auth/password` | Contraseña actual y nueva; invalida otras sesiones |
| GET | `/api/settings` | Nombre, moneda, impuesto sugerido y política de pago |

## Catálogos y equipo

`/api/customers`, `/api/vehicles` y `/api/services` admiten GET de lista, POST de creación y PUT `/{id}` de actualización/desactivación. Las entradas están definidas en `Contracts/Requests.cs`.

| Método | Ruta | Uso |
| --- | --- | --- |
| GET / POST | `/api/appointments` | Agenda y nueva cita |
| POST | `/api/appointments/{id}/status` | Cambiar estado; Atendida solo desde recepción |
| GET | `/api/mechanics` | Mecánicos activos para asignar |
| GET / POST | `/api/users` | Equipo, solo administrador |
| POST | `/api/users/{id}/deactivate` | Desactivar otra cuenta |
| GET | `/api/audit` | Últimos 200 registros, solo administrador |

## Órdenes

GET `/api/orders` filtra automáticamente las órdenes asignadas si el usuario es mecánico. GET `/api/orders/{id}` incluye recepción, cotizaciones, trabajos, pagos e historial. POST `/api/orders` recibe el vehículo y entrega una credencial de seguimiento una sola vez.

Las siguientes rutas tienen prefijo `/api/orders/{id}` y usan POST:

| Sufijo | Operación |
| --- | --- |
| `/status` | Transición validada de estado |
| `/assignments` | Asignar mecánico |
| `/assignments/{assignmentId}/end` | Finalizar asignación |
| `/diagnoses` | Diagnóstico y fallas |
| `/quotes` | Nueva versión completa de cotización |
| `/quotes/{quoteId}/authorization` | Consentimiento o rechazo de la versión actual |
| `/repairs` | Trabajo asociado a concepto autorizado |
| `/repairs/{repairId}/complete` | Terminar trabajo |
| `/tests` | Registrar prueba |
| `/payments` | Registrar pago sin sobrepasar saldo |
| `/delivery` | Entregar y cerrar orden |
| `/updates` | Mensaje público o interno |
| `/tracking` | Regenerar QR/código, revocando anteriores |
| `/tracking/revoke` | Revocar credenciales actuales |
| `/evidence` | `multipart/form-data`: `file`, `description`, `stage`, `visibleToCustomer` |

GET `/api/orders/{id}/evidence/{evidenceId}` exige autorización para la orden. Los archivos no se sirven desde `wwwroot`.

## Portal del cliente

POST `/api/tracking/access` acepta `{ "token": "..." }` o `{ "folio": "...", "code": "..." }`. El token del QR viaja en el fragmento del enlace, se retira del historial del navegador y se intercambia mediante POST por una cookie protegida y limitada a una hora.

GET `/api/tracking/order` resuelve la orden desde esa cookie. No acepta un identificador de orden como autorización. GET `/api/tracking/evidence/{id}` verifica de nuevo la misma orden y la visibilidad del archivo. POST `/api/tracking/logout` elimina la cookie. La revocación o vencimiento de la credencial invalida las consultas aunque exista una cookie anterior.
