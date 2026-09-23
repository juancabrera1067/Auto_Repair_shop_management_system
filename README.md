# Sistema de gestión de taller automotriz

Primera versión funcional basada en los tres documentos proporcionados. Incluye un panel para el personal y un portal de seguimiento limitado a una orden. Usa ASP.NET Core 8, C#, Entity Framework Core 8, ASP.NET Core Identity y SQL Server. La interfaz está en español y utiliza HTML, CSS y JavaScript locales, sin depender de CDN.

## 📚 Documentación

Toda la documentación del proyecto está organizada en la carpeta `docs/`:

| Documento | Descripción |
|-----------|-------------|
| [Arquitectura](docs/arquitectura.md) | Capas, modelo de datos, API, seguridad |
| [Diseño preliminar](docs/diseno-preliminar.md) | Entidades, campos y relaciones de la base de datos |
| [Especificación funcional](docs/especificacion-funcional.md) | Módulos, flujo de órdenes, roles y permisos |
| [Planeación de seguridad](docs/planeacion-seguridad.md) | Acceso por QR/código, alcance por versiones |
| [Manual de usuario](docs/manual-usuario.md) | Uso del panel y portal del cliente |
| [Decisiones](docs/decisiones.md) | Decisiones de implementación y modelo |
| [API](docs/api.md) | Referencia completa de rutas |
| [Base de datos](docs/database.sql) | Script SQL idempotente |
| [Documentos fuente](documentacion/) | 3 archivos .docx originales |

## Ejecutar en Windows

Requisitos: .NET SDK 8, SQL Server LocalDB (incluido en las herramientas de datos de Visual Studio) o una instancia de SQL Server accesible.

Desde esta carpeta:

```powershell
dotnet restore
dotnet build --no-restore
dotnet run --project src/Taller.Web
```

Abre **http://localhost:5180**. En el primer inicio, crea tu administrador desde el formulario. No hay una contraseña predeterminada ni registros de clientes ficticios en la base principal. En desarrollo se aplican las migraciones pendientes y se crean los roles y dos servicios iniciales con precio base de cero.

En Visual Studio, abre `Auto_Repair_shop_management_system.sln`, selecciona **Taller.Web** como proyecto de inicio y ejecuta con el perfil **Taller.Web**. El proyecto existente conserva su solución original.

También puedes usar `./scripts/Start-Taller.ps1` después de compilar. El proceso permanece activo hasta detenerlo con Ctrl+C.

## Primer recorrido

1. Crea un cliente y registra su vehículo.
2. En Equipo, agrega a recepción y a los mecánicos con sus cuentas personales.
3. Crea una cita o utiliza **Recibir vehículo** directamente.
4. Completa el checklist. Guarda el QR y código que aparecen al crear la orden; solo se muestran al generarlos.
5. Asigna al mecánico. Cambia a **Diagnóstico** y registra el hallazgo, causa y recomendación.
6. Cambia a **Cotización**, agrega conceptos y crea la versión. Cambia a **Autorización** y registra la respuesta del cliente con evidencia de su consentimiento.
7. Cambia a **En reparación**, registra trabajos para cada concepto autorizado y finalízalos.
8. Cambia a **Pruebas** y registra el resultado. Una prueba fallida devuelve la orden a reparación.
9. Con una prueba satisfactoria, avanza a **Reparado** y **Listo para entrega**.
10. Registra los pagos, entrega con kilometraje de salida y conformidad del cliente. La orden queda disponible como historial.

Las notas técnicas son internas. Usa **Actualizaciones** y la opción **Mostrar al cliente** para comunicar avances. Las evidencias requieren la misma elección explícita de visibilidad.

## Configuración

Edita `src/Taller.Web/appsettings.json` o crea `src/Taller.Web/appsettings.Local.json` (excluido de Git). También se admiten variables de entorno con doble guion bajo.

| Opción | Valor inicial | Uso |
| --- | --- | --- |
| `ConnectionStrings:Taller` | LocalDB / TallerAutomotriz | Base principal |
| `Taller:Nombre` | Taller Automotriz | Nombre del negocio |
| `Taller:Moneda` | GTQ | Presentación de importes |
| `Taller:ImpuestoPorcentaje` | 0 | Valor sugerido en nuevas cotizaciones; debe configurarse según el negocio |
| `Taller:PublicBaseUrl` | http://localhost:5180 | URL utilizada en el QR |
| `Taller:DiasSeguimiento` | 90 | Vigencia máxima inicial de la credencial |
| `Taller:DiasSeguimientoTrasEntrega` | 7 | Límite posterior a la entrega, sin extender la vigencia original |
| `Taller:ExigirPagoParaEntrega` | true | Impide entregar con saldo pendiente |

Las fechas se almacenan con desplazamiento UTC y la interfaz las muestra en la hora local del navegador. `Taller:ZonaHoraria` documenta la zona operativa; no modifica la zona del navegador. Los impuestos son parámetros de cálculo, no una implementación de facturación fiscal.

Ejemplo de conexión a una instancia existente con autenticación de Windows:

```json
{
  "ConnectionStrings": {
    "Taller": "Server=.\\SQLEXPRESS;Database=TallerAutomotriz;Trusted_Connection=True;TrustServerCertificate=True"
  }
}
```

Un QR con `localhost` sirve únicamente en esta computadora. Para consultarlo desde teléfonos, se necesita una dirección HTTPS accesible por esos dispositivos, configurar `PublicBaseUrl`, `AllowedHosts` y el alojamiento correspondiente. Esta entrega se ejecuta localmente; no publica el sistema en Internet.

## Documentación

La documentación completa del proyecto se encuentra en la carpeta `docs/` y en los archivos originales de la carpeta `documentacion/`.

### Documentación técnica

| Documento | Descripción |
|-----------|-------------|
| [docs/diseno-preliminar.md](docs/diseno-preliminar.md) | Diseño preliminar de base de datos con entidades, campos y relaciones |
| [docs/especificacion-funcional.md](docs/especificacion-funcional.md) | Especificación funcional completa: módulos, flujo de órdenes, roles |
| [docs/planeacion-seguridad.md](docs/planeacion-seguridad.md) | Planeación de seguridad, acceso por QR/código, alcance por versiones |
| [docs/arquitectura.md](docs/arquitectura.md) | Arquitectura del sistema, capas, modelo de datos, API, seguridad |
| [docs/decisiones.md](docs/decisiones.md) | Decisiones de implementación, permisos por rol, integridad del modelo |
| [docs/api.md](docs/api.md) | Referencia completa de la API REST |
| [docs/database.sql](docs/database.sql) | Script SQL idempotente del esquema de base de datos |
| [docs/manual-usuario.md](docs/manual-usuario.md) | Manual del usuario para panel de gestión y portal del cliente |

### Documentos fuente originales

Los archivos originales en formato `.docx` se encuentran en la carpeta `documentacion/`:

- `Taller_Automotriz_Diseno_Preliminar_Base_Datos.docx`
- `Taller_Automotriz_Especificacion_Funcional.docx`
- `Taller_Automotriz_Planeacion_Seguridad_y_Modelo.docx`

## Estructura

```text
src/Taller.Web/
  Contracts/        Entradas validadas de la API
  Controllers/      Autenticación, catálogos, órdenes, archivos y portal
  Domain/           Entidades y estados
  Data/             DbContext, migraciones e inicialización
  Services/         Reglas del proceso y credenciales de seguimiento
  wwwroot/          Panel y portal del cliente
  App_Data/         Evidencias y claves locales; excluido de Git
docs/
  api.md            Rutas y uso de la API
  database.sql      Migración SQL Server idempotente
  decisiones.md     Alcance, permisos y decisiones del modelo
  diseno-preliminar.md  Diseño preliminar de base de datos
  especificacion-funcional.md  Especificación funcional
  planeacion-seguridad.md  Planeación de seguridad y modelo de datos
  arquitectura.md   Arquitectura del sistema y capas
  manual-usuario.md  Manual del usuario para el sistema
tests/
  integration.py    Pruebas HTTP contra SQL Server real
scripts/            Ejecución local y pruebas aisladas
documentacion/      Documentos fuente originales (.docx)
```

## Base de datos

La migración `InitialWorkshop` es la fuente versionada del esquema. `docs/database.sql` permite revisar o aplicar el mismo esquema a una base seleccionada. El script no crea el usuario administrador ni siembra servicios; esa inicialización se realiza con la aplicación.

Para gestionar futuras migraciones:

```powershell
dotnet tool restore
dotnet ef migrations add NombreDelCambio --project src/Taller.Web
dotnet ef migrations script --idempotent --project src/Taller.Web --output docs/database.sql
```

En un entorno distinto de Development, las migraciones se aplican explícitamente:

```powershell
dotnet run --project src/Taller.Web --no-launch-profile -- --migrate
```

Configura `Bootstrap__Email` y `Bootstrap__Password` mediante un almacén de secretos o el entorno para crear el primer administrador al inicializar una base vacía fuera de desarrollo. Retira esos valores después. El formulario público de creación inicial solo funciona en Development desde la interfaz de loopback.

## Verificación

```powershell
dotnet build --no-restore
./scripts/Test-Integration.ps1 -Python python
```

Las pruebas usan únicamente la biblioteca estándar de Python 3. Cada ejecución crea una base **TallerAutomotriz_Test_GUID** y un servidor temporal en el puerto 5181. No modifican la base principal; conservan la base aislada para inspección y detienen su servidor al terminar. Los registros del servidor se guardan en `.artifacts/`. Si deseas eliminar bases de pruebas después, verifica el nombre exacto desde SQL Server Management Studio.

Cubren permisos y CSRF, asignación de mecánicos, aislamiento entre órdenes, visibilidad de archivos, cotizaciones y autorizaciones, el proceso completo, pagos parciales, entrega, citas, revocación de sesiones y concurrencia de pagos.

## Alcance pendiente

La segunda versión contempla autorización digital/parcial, correo, reportes avanzados y cuentas de clientes con historial. Inventario, proveedores, compras, WhatsApp y facturación permanecen para la tercera versión. No hay integraciones externas ni envíos de mensajes.

Antes de alojarlo para operación real hay que configurar HTTPS y conexión SQL con certificado válido, respaldos de SQL y `App_Data`, protección de claves de Data Protection, almacenamiento de archivos y su análisis antimalware, recuperación de cuentas y una política de retención. El límite inicial de evidencias es 5 MB por archivo; se validan firmas JPEG/PNG/PDF y se descargan como adjuntos, pero esa comprobación no sustituye un escáner antimalware.
