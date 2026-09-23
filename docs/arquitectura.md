# Arquitectura del Sistema de Gestión de Taller Automotriz

## Visión general

El sistema es una aplicación web de pila completa construida con ASP.NET Core 8 para el backend y HTML/CSS/JavaScript nativo para el frontend. Utiliza Entity Framework Core 8 con SQL Server como base de datos y ASP.NET Core Identity para autenticación y autorización.

## Stack tecnológico

| Componente | Tecnología |
|------------|------------|
| Framework backend | ASP.NET Core 8 |
| Lenguaje | C# |
| ORM | Entity Framework Core 8 |
| Base de datos | SQL Server (LocalDB/SQL Server Express) |
| Autenticación | ASP.NET Core Identity |
| Frontend | HTML5, CSS3, JavaScript nativo |
| Generación QR | QRCoder 1.8.0 |
| Servidor web | Kestrel |
| Control de versiones | Git |
| Pruebas | Python 3 (integración HTTP) |

## Estructura del proyecto

```
src/Taller.Web/
  Contracts/        Entradas validadas de la API (record DTOs)
  Controllers/      Controladores: autenticación, catálogos, órdenes, archivos y portal
  Domain/           Entidades y enumeraciones de estados
  Data/             DbContext, migraciones e inicialización de base de datos
  Services/         Reglas del proceso de negocio, credenciales de seguimiento y almacenamiento
  wwwroot/          Panel de gestión y portal del cliente
  App_Data/         Evidencias y claves locales (excluido de Git)
docs/
  api.md            Rutas y uso de la API
  database.sql      Migración SQL Server idempotente
  decisiones.md     Alcance, permisos y decisiones del modelo
  diseno-preliminar.md  Diseño preliminar de base de datos
  especificacion-funcional.md  Especificación funcional
  planeacion-seguridad.md  Planeación de seguridad y modelo de datos
tests/
  integration.py    Pruebas HTTP contra SQL Server real
scripts/            Scripts de ejecución local y pruebas aisladas
```

## Capas y responsabilidades

### Capa de Presentación (wwwroot)

- **index.html**: Panel de gestión del personal del taller.
- **seguimiento.html**: Portal del cliente para consulta de órdenes.
- **app.js**: Lógica del panel administrativo (navegación, formularios, estados).
- **seguimiento.js**: Lógica del portal del cliente.
- **styles.css** / **base.css**: Estilos del sistema.

### Capa de Controladores (Controllers/)

- **AuthController.cs**: Autenticación, configuración inicial, inicio de sesión, cierre de sesión y cambio de contraseña.
- **CatalogController.cs**: Gestión de clientes, vehículos, servicios, citas, usuarios y auditoría.
- **OrdersController.cs**: Recepción de vehículos, transiciones de estado, asignaciones, diagnósticos, cotizaciones, reparaciones, pruebas, pagos y entrega.
- **EvidenceController.cs**: Subida y descarga de evidencias (JPEG, PNG, PDF).
- **TrackingController.cs**: Acceso del portal del cliente mediante token, folio o código.

### Capa de Servicios (Services/)

- **OrderService.cs**: Orquestación del flujo de órdenes, transiciones de estado, validaciones de negocio y entrega.
- **Rules.cs**: Reglas de negocio transversales: permisos, cálculo de balances, transiciones válidas.
- **TrackingService.cs**: Emisión de credenciales de seguimiento (QR y código), hash de tokens.
- **StoragePaths.cs**: Rutas de almacenamiento para evidencias y claves de protección de datos.

### Capa de Dominio (Domain/)

- **Models.cs**: Todas las entidades del dominio, enumeraciones de estados y definición de roles.
- **Roles.cs**: Constantes de roles (Administrador, Recepcion, Mecanico).

### Capa de Datos (Data/)

- **TallerDbContext.cs**: DbContext de Entity Framework Core con configuración de relaciones, índices y restricciones CHECK.
- **DbInitializer.cs**: Inicialización de roles, servicios predeterminados y creación del primer administrador.
- **Migrations/**: Migraciones de Entity Framework Core para el esquema de base de datos.

## Modelo de datos principal

El modelo sigue un patrón de herencia donde `Entity` proporciona la propiedad `Id` y `OrderRecord` extiende `Entity` para registros vinculados a una orden de servicio.

**Entidades principales:**
- `StaffUser` (hereda de `IdentityUser`): Usuarios del sistema con roles.
- `Customer`: Clientes del taller.
- `Vehicle`: Vehículos registrados por clientes.
- `Service`: Servicios ofrecidos (catálogo).
- `Appointment`: Citas programadas.
- `WorkOrder`: Órdenes de servicio (máquina de estados).
- `Reception`: Recepción del vehículo con checklist.
- `Diagnosis` / `Fault`: Diagnósticos técnicos y fallas identificadas.
- `Quote` / `QuoteLine` / `QuoteAuthorization`: Cotizaciones con versiones.
- `Assignment`: Asignación de mecánicos a órdenes.
- `Repair`: Trabajos realizados contra conceptos autorizados.
- `VehicleTest`: Pruebas del vehículo.
- `Payment`: Pagos registrados.
- `Delivery`: Entrega del vehículo.
- `Evidence`: Archivos adjuntos (fotos, documentos).
- `OrderUpdate`: Actualizaciones comunicadas al cliente.
- `TrackingAccess`: Credenciales de seguimiento para clientes.
- `StatusHistory`: Historial de cambios de estado.
- `AuditEntry`: Bitácora de acciones administrativas.

## Flujo de estados de una orden

```
Cita → Recepción → Ingresado → En espera → Diagnóstico → Cotización → Autorización → En reparación → Pruebas → Reparado → Listo para entrega → Entregado
```

Las transiciones están validadas por `Rules.Next()` y `OrderService.Transition()`. Cada transición genera un registro en `StatusHistory` y `AuditEntry`.

## Autenticación y seguridad

- **ASP.NET Core Identity** proporciona usuarios, roles y contraseñas con hash.
- **Cookies HttpOnly** con SameSite=Strict para el panel y el portal.
- **Rate limiting** en rutas de credenciales (20 intentos/IP/minuto).
- **Bloqueo de cuenta** tras 5 intentos fallidos durante 15 minutos.
- **Validación de usuario activo** en cada petición mediante `OnValidatePrincipal`.
- **Protección de datos** con DataProtection y claves almacenadas en `App_Data/keys`.
- **Anti-CSRF** con token en header `X-CSRF-TOKEN`.
- **CSP** (Content Security Policy) restrictiva: solo recursos propios.

## API REST

Todas las rutas usan JSON (excepto carga de evidencias). El sistema sigue el patrón REST con prefijo `/api/`.

| Recurso | Métodos | Descripción |
|---------|---------|-------------|
| `/api/auth/csrf` | GET | Token anti-CSRF |
| `/api/auth/session` | GET | Estado de sesión y configuración |
| `/api/auth/setup` | POST | Creación de primer administrador |
| `/api/auth/login` | POST | Inicio de sesión |
| `/api/auth/logout` | POST | Cierre de sesión |
| `/api/auth/password` | POST | Cambio de contraseña |
| `/api/settings` | GET | Configuración del taller |
| `/api/customers` | GET/POST/PUT | Gestión de clientes |
| `/api/vehicles` | GET/POST/PUT | Gestión de vehículos |
| `/api/services` | GET/POST/PUT | Catálogo de servicios |
| `/api/appointments` | GET/POST | Citas |
| `/api/mechanics` | GET | Mecánicos activos |
| `/api/users` | GET/POST | Equipo del taller |
| `/api/orders` | GET/POST | Órdenes de servicio |
| `/api/orders/{id}` | GET | Detalle completo de orden |
| `/api/orders/{id}/status` | POST | Cambio de estado |
| `/api/orders/{id}/assignments` | POST | Asignar mecánico |
| `/api/orders/{id}/diagnoses` | POST | Registrar diagnóstico |
| `/api/orders/{id}/quotes` | POST | Crear cotización |
| `/api/orders/{id}/quotes/{quoteId}/authorization` | POST | Autorizar/rechazar |
| `/api/orders/{id}/repairs` | POST | Registrar trabajo |
| `/api/orders/{id}/tests` | POST | Registrar prueba |
| `/api/orders/{id}/payments` | POST | Registrar pago |
| `/api/orders/{id}/delivery` | POST | Entregar vehículo |
| `/api/orders/{id}/updates` | POST | Actualización |
| `/api/orders/{id}/evidence` | POST/GET | Evidencias |
| `/api/tracking/access` | POST | Acceso del cliente |
| `/api/tracking/order` | GET | Estado de la orden (portal) |

## Portal del cliente

El portal está aislado del panel administrativo. El acceso se realiza mediante:

1. **Token QR**: El token del QR viaja en el fragmento del enlace, se retira del historial del navegador y se intercambia por una cookie protegida.
2. **Folio + Código**: Consulta manual con folio visible y código de seguimiento.

El portal muestra: estado simplificado, vehículo, folio, cotización autorizada, actualizaciones públicas, evidencias visibles y saldo pendiente. No expone diagnóstico técnico, notas internas ni nombres del personal.

## Configuración

La configuración se lee de `appsettings.json`, `appsettings.Local.json` (opcional, excluido de Git) y variables de entorno (con doble guion bajo como separador).

| Clave | Valor inicial | Descripción |
|-------|---------------|-------------|
| `ConnectionStrings:Taller` | LocalDB | Cadena de conexión a SQL Server |
| `Taller:Nombre` | Taller Automotriz | Nombre del negocio |
| `Taller:Moneda` | GTQ | Moneda de presentación |
| `Taller:ImpuestoPorcentaje` | 0 | Impuesto sugerido para cotizaciones |
| `Taller:PublicBaseUrl` | http://localhost:5180 | URL base para QR |
| `Taller:DiasSeguimiento` | 90 | Vigencia del seguimiento |
| `Taller:DiasSeguimientoTrasEntrega` | 7 | Vigencia post-entrega |
| `Taller:ExigirPagoParaEntrega` | true | Requiere saldo cero para entregar |
| `Taller:ZonaHoraria` | America/Guatemala | Zona horaria operativa |

## Despliegue y desarrollo

### Desarrollo local

```powershell
dotnet restore
dotnet build --no-restore
dotnet run --project src/Taller.Web
```

### Base de datos

- La migración `InitialWorkshop` es la fuente versionada del esquema.
- `docs/database.sql` contiene el script SQL idempotente.
- En desarrollo se aplican migraciones automáticamente.
- Para producir: `dotnet ef migrations script --idempotent --output docs/database.sql`

### Pruebas de integración

```powershell
./scripts/Test-Integration.ps1 -Python python
```

Las pruebas crean una base de datos aislada, ejecutan la aplicación en el puerto 5181 y ejecutan `tests/integration.py` que cubre:
- Permisos y CSRF
- Asignación de mecánicos y aislamiento entre órdenes
- Visibilidad de archivos
- Cotizaciones y autorizaciones
- Proceso completo (recepción a entrega)
- Pagos parciales y entrega
- Revocación de sesiones
- Concurrrencia de pagos

## Principios de diseño

1. **Separación de capas**: Presentación, Controladores, Servicios, Dominio y Datos están claramente separadas.
2. **Máquina de estados**: Las órdenes avanzan por estados válidos definidos en `Rules.Next()`.
3. **Inmutabilidad de versiones**: Las cotizaciones generan nuevas versiones sin modificar las anteriores.
4. **Auditoría**: Cada acción relevante se registra en `AuditEntry`.
5. **Isolamiento**: El portal del cliente no comparte sesión con el panel del personal.
6. **Validación en el servidor**: Toda autorización se verifica en el backend, no solo en la interfaz.
7. **Transacciones serializables**: Para recepción, cambios de órdenes y creación de citas.
