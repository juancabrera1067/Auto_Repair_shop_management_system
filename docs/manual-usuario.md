# Manual del Usuario — Sistema de Gestión de Taller Automotriz

## Introducción

Este manual describe el uso del sistema de gestión de taller automotriz. El sistema se divide en dos áreas: el **panel de gestión** para el personal del taller y el **portal de seguimiento** para los clientes.

## Primeros pasos

### Requisitos

- .NET SDK 8
- SQL Server LocalDB o una instancia de SQL Server accesible
- Navegador web moderno
- Para el portal: un folio y código de seguimiento proporcionados por el taller

### Acceso al sistema

**Panel de gestión:**
1. Abra el navegador y vaya a `http://localhost:5180`.
2. Si es la primera vez, cree la cuenta de administrador desde el formulario de configuración.
3. Inicie sesión con su correo y contraseña.

**Portal del cliente:**
1. Abra `http://localhost:5180/seguimiento`.
2. Ingrese el folio de su orden y el código de seguimiento que le proporcionó el taller.
3. O escanea el código QR generado al crear la orden.

## Panel de gestión

### Navegación

El panel tiene un menú lateral con las siguientes secciones:

- **Dashboard**: Resumen de operaciones con indicadores de órdenes activas.
- **Órdenes de servicio**: Lista de todas las órdenes con filtros por estado y búsqueda.
- **Agenda**: Gestión de citas programadas.
- **Clientes**: Alta, edición y consulta de clientes.
- **Vehículos**: Registro y edición de vehículos por cliente.
- **Servicios**: Catálogo de servicios ofrecidos con precios.
- **Equipo**: Gestión de usuarios del sistema (solo administrador).
- **Bitácora**: Registro de las últimas 200 operaciones del sistema.

### Roles y permisos

| Operación | Administrador | Recepción | Mecánico |
|-----------|:------------:|:---------:|:--------:|
| Clientes, vehículos, servicios | ✓ | ✓ | ✗ |
| Citas | ✓ | ✓ | ✗ |
| Recibir vehículos | ✓ | ✓ | ✗ |
| Asignar mecánicos | ✓ | ✓ | ✗ |
| Crear cotizaciones | ✓ | ✓ | ✗ |
| Registrar consentimiento | ✓ | ✓ | ✗ |
| Diagnósticos | ✓ | ✓ | Solo en sus órdenes |
| Trabajos | ✓ | ✓ | Solo en sus órdenes |
| Pruebas | ✓ | ✓ | Solo en sus órdenes |
| Pagos y entrega | ✓ | ✓ | ✗ |
| Usuarios y auditoría | ✓ | ✗ | ✗ |

### Flujo de trabajo de una orden

#### 1. Crear un cliente

1. Vaya a **Clientes** → **+ Nuevo cliente**.
2. Complete el formulario con nombre, teléfono, correo y dirección.
3. Guarde el cliente.

#### 2. Registrar un vehículo

1. Vaya a **Vehículos** → **+ Nuevo vehículo**.
2. Seleccione el cliente propietario.
3. Ingrese marca, modelo, año, placa, kilometraje, VIN (opcional) y otros datos.
4. Guarde el vehículo.

#### 3. Crear una cita (opcional)

1. Vaya a **Agenda** → **+ Nueva cita**.
2. Seleccione el vehículo, servicio, fecha/hora y motivo.
3. Guarde la cita.

#### 4. Recibir el vehículo

1. En la lista de **Órdenes**, haga clic en **+ Recibir vehículo** o convierta una cita.
2. Ingrese el kilometraje de ingreso, motivo, prioridad y fecha de entrega estimada.
3. Registre los datos de recepción: combustible, llaves, accesorios, objetos personales y daños.
4. Complete el checklist de recepción (estado de carrocería, cristales, luces, neumáticos e interior).
5. Guarde la orden. Se generará un folio, un código de seguimiento y un código QR.

#### 5. Diagnóstico

1. Cambie el estado de la orden a **Diagnóstico**.
2. Registre el problema encontrado, la causa probable, la recomendación y las fallas adicionales.
3. Cada falla tiene una prioridad (Normal, Alta, Urgente).

#### 6. Cotización

1. Cambie el estado a **Cotización**.
2. Agregue conceptos (servicio, mano de obra, refacción) con cantidad y precio unitario.
3. Aplique descuento y porcentaje de impuesto si corresponde.
4. Defina la fecha de vencimiento de la cotización.
5. Guarde la cotización. Cada nueva versión reemplaza la propuesta completa y conserva las anteriores.

#### 7. Autorización

1. Cambie el estado a **Autorización**.
2. Registre la respuesta del cliente: autorización o rechazo.
3. Adjunte la constancia de consentimiento en **Evidencias**.
4. Si se rechaza, la orden puede volver a cotización para generar una nueva versión.

#### 8. Reparación

1. Cambie el estado a **En reparación**.
2. Asigne un mecánico a la orden.
3. Para cada concepto autorizado, registre el trabajo realizado.
4. Finalice cada trabajo cuando esté completado.

#### 9. Pruebas

1. Cambie el estado a **Pruebas**.
2. Registre el tipo de prueba (carretera, frenado, electrónica, funcionamiento, inspección visual).
3. Registre el resultado: satisfactorio, requiere revisión o no satisfactorio.
4. Si la prueba falla, la orden vuelve a reparación.
5. Si es satisfactoria, avance a reparado.

#### 10. Entrega

1. Cambie el estado a **Listo para entrega**.
2. Registre el pago (parcial o total) si hay saldo pendiente.
3. Cambie el estado a **Entregado**.
4. Ingrese el kilometraje de salida, el nombre de quien recibe y la conformidad del cliente.
5. La orden queda como historial.

### Gestión de estados

Cada orden tiene una máquina de estados que limita las transiciones válidas. Solo se pueden realizar cambios de estado permitidos según el rol del usuario. Cada transición se registra en el historial de estados.

### Evidencias

- Adjunte archivos (JPEG, PNG o PDF, máximo 5 MB) en cualquier momento.
- Seleccione la etapa: Recepción, Daño, Diagnóstico, Refacción, Reparación, Prueba o Entrega.
- Marque si la evidencia debe ser visible para el cliente.
- Descargue evidencias desde el detalle de la orden.

### Comunicación con el cliente

- Use **Actualizaciones** para enviar mensajes al cliente.
- Marque la casilla **Mostrar al cliente** para que el mensaje sea visible en el portal.
- Los mensajes internos no se muestran al cliente.

## Portal del cliente

### Consultar el estado de una orden

1. Abra el portal en `http://localhost:5180/seguimiento`.
2. Ingrese su folio y código de seguimiento.
3. Vea el estado actual del vehículo, las etapas del proceso y la fecha estimada de entrega.

### Información disponible en el portal

- **Vehículo**: Marca, modelo, año y placa.
- **Estado**: Indicador simplificado del estado actual.
- **Progreso**: Barra de etapas completadas.
- **Cotización**: La versión más reciente autorizada con sus conceptos.
- **Actualizaciones**: Solo los mensajes marcados como visibles para el cliente.
- **Evidencias**: Solo los archivos marcados como visibles.
- **Saldo pendiente**: Monto restante para la entrega.

### Información NO disponible

- Diagnóstico técnico y fallas.
- Notas internas y bitácora.
- Nombres del personal.
- Información de otros clientes u órdenes.

## Configuración del sistema

### Parámetros del taller

La configuración se puede modificar en `src/Taller.Web/appsettings.json` o mediante variables de entorno:

- **Nombre del taller**: Se muestra en la interfaz.
- **Moneda**: Afecta la presentación de montos (GTQ por defecto).
- **Impuesto**: Porcentaje sugerido para nuevas cotizaciones.
- **Exigir pago para entrega**: Si está activo, no se puede entregar con saldo pendiente.
- **Días de seguimiento**: Vigencia de las credenciales de acceso.

### Primera configuración

- El administrador se crea en desarrollo desde la interfaz de loopback.
- En producción, configure `Bootstrap__Email` y `Bootstrap__Password` mediante un almacén de secretos.
- El formulario público de creación inicial solo funciona en desarrollo desde la interfaz de loopback.

## Solución de problemas

### La aplicación no inicia

- Verifique que SQL Server LocalDB esté instalado y disponible.
- Ejecute `dotnet restore` y `dotnet build` para asegurar que los paquetes estén descargados.
- Revise los logs en la consola donde se ejecuta la aplicación.

### No se pueden crear órdenes

- Verifique que el cliente y el vehículo estén activos.
- Asegúrese de que el kilometraje de ingreso sea mayor o igual al registrado.
- Confirme que el vehículo no tenga una orden abierta (no entregada).

### Errores de permisos

- Verifique que su rol tenga permisos para la acción que intenta realizar.
- Los mecánicos solo pueden ver y actuar en órdenes que les han sido asignadas.

### La contraseña expiró o fue bloqueada

- Tras 5 intentos fallidos, la cuenta se bloquea durante 15 minutos.
- Use la opción de cambio de contraseña desde el menú de usuario.

## Funciones futuras

Las siguientes funciones están planificadas para versiones posteriores:

- Autorización digital y parcial de cotizaciones.
- Notificaciones por correo electrónico.
- Integración con WhatsApp.
- Inventario de refacciones y proveedores.
- Reportes financieros avanzados.
- Facturación fiscal.
- Historia completa del cliente.
- Múltiples sucursales.

Documento de trabajo — sujeto a revisión conforme avance el diseño.
