# Sistema de Gestión y Seguimiento para Taller Automotriz

Documento de planificación — Versión inicial

## 1. Propósito del documento

Este documento consolida la planificación funcional realizada hasta el momento para un sistema web orientado a la gestión de un taller automotriz. El objetivo es establecer una base de diseño antes de iniciar la programación, evitando cambios estructurales innecesarios durante el desarrollo.

## 2. Objetivo general del sistema

Desarrollar una plataforma web que permita administrar clientes, vehículos, citas y órdenes de servicio, así como registrar y consultar el avance de un automóvil durante su estancia en el taller. El cliente contará con un portal restringido desde el cual podrá consultar únicamente la información correspondiente a sus vehículos y servicios.

## 3. Concepto general

El sistema se divide en dos áreas principales:

- **Área administrativa/taller**: gestión de clientes, vehículos, citas, recepción, diagnósticos, cotizaciones, reparaciones, evidencias, pagos, entregas y reportes.
- **Portal del cliente**: consulta del estado del vehículo, diagnóstico, reparaciones, cotizaciones, evidencias autorizadas para mostrar y citas.

**Flujo principal propuesto:**
Cita → Recepción → Ingresado → En espera → Diagnóstico → Cotización → Autorización → En reparación → Pruebas → Reparado → Listo para entrega → Entregado

## 4. Usuarios y roles

| Rol | Responsabilidades principales | Restricciones |
|-----|-------------------------------|---------------|
| Administrador | Control general del sistema; usuarios, clientes, vehículos, citas, órdenes, cotizaciones, pagos, reportes y configuración. | Ninguna restricción funcional relevante dentro de su ámbito. |
| Recepción | Registrar clientes y vehículos, crear citas, recibir automóviles, actualizar estados, registrar cotizaciones y pagos. | No administrar configuración avanzada ni usuarios, salvo permisos expresamente asignados. |
| Mecánico | Consultar órdenes asignadas, registrar diagnóstico, fallas, trabajos, evidencias y pruebas. | No modificar usuarios, configuración, pagos ni información administrativa fuera de su función. |
| Cliente | Consultar sus vehículos, órdenes, estados, cotizaciones, evidencias visibles, historial y citas. | No puede acceder al panel administrativo ni a información de otros clientes. |

## 5. Módulos principales

- Dashboard administrativo
- Clientes
- Vehículos
- Citas y agenda
- Recepción de vehículos
- Órdenes de servicio
- Diagnóstico y fallas
- Cotizaciones y autorizaciones
- Reparaciones
- Evidencias fotográficas
- Pruebas del vehículo
- Pagos
- Entrega de vehículos
- Historial de servicios
- Usuarios y roles
- Reportes
- Bitácora de auditoría
- Configuración

## 6. Flujo de una orden de servicio

| Estado | Descripción |
|--------|-------------|
| Cita | El cliente solicita un servicio y fecha/hora. |
| Recepción | El personal registra el ingreso, kilometraje, checklist, accesorios, observaciones y fotografías. |
| Ingresado | El vehículo queda formalmente registrado en el taller. |
| En espera | El vehículo espera disponibilidad, pieza, mecánico u otra condición. |
| Diagnóstico | Se documentan falla reportada, diagnóstico técnico, causa, recomendación y evidencias. |
| Cotización | Se generan conceptos de refacciones, servicios y mano de obra. |
| Autorización | El cliente puede autorizar, rechazar o autorizar parcialmente los trabajos. |
| En reparación | Se registran trabajos realizados, responsables, fechas y evidencias. |
| Pruebas | Se verifican las reparaciones; si una prueba falla, la orden puede regresar a reparación. |
| Reparado | Las reparaciones se consideran finalizadas. |
| Listo para entrega | El cliente es notificado y se muestra el saldo pendiente. |
| Entregado | Se registra pago final, kilometraje de salida, fecha/hora y conformidad de entrega. |

## 7. Citas

La agenda permitirá solicitar y administrar citas para servicios de rutina o revisiones.

- Servicio solicitado.
- Vehículo.
- Fecha y horario.
- Motivo o problema reportado.
- Observaciones.
- Estado de la cita.

**Estados previstos:** Pendiente, Confirmada, En espera, Atendida, Cancelada, No asistió

## 8. Recepción del vehículo

La recepción representa el momento en que el automóvil entra físicamente al taller.

- Fecha y hora de entrada.
- Kilometraje de entrada.
- Nivel de combustible.
- Cantidad de llaves.
- Llanta de refacción, gato y herramientas.
- Objetos personales y documentos declarados.
- Daños preexistentes y observaciones.
- Fotografías del exterior, interior, tablero y odómetro.
- Checklist de recepción.

## 9. Diagnóstico y fallas

El sistema distinguirá entre la falla reportada por el cliente y el diagnóstico técnico realizado por el taller.

- Problema reportado.
- Problema encontrado.
- Causa probable o identificada.
- Recomendación.
- Prioridad.
- Pruebas realizadas.
- Fallas adicionales.
- Fotografías y observaciones.

## 10. Cotizaciones y autorizaciones

Las cotizaciones podrán contener refacciones, mano de obra, servicios, descuentos e impuestos. Se conservará el historial de versiones para evitar sobrescribir una cotización previamente emitida.

- Autorización total.
- Rechazo.
- Autorización parcial.
- Autorización presencial.
- Autorización digital.
- Fecha, usuario/cliente y versión de la cotización.

## 11. Evidencias fotográficas

Las fotografías estarán asociadas a una orden de servicio y podrán clasificarse por etapa: Recepción, Daño, Diagnóstico, Refacción, Reparación, Prueba, Entrega.

Cada evidencia tendrá descripción, fecha, usuario y una bandera VisibleCliente para controlar qué información puede consultar el cliente.

## 12. Pruebas del vehículo

- Prueba de carretera.
- Prueba de frenado.
- Prueba electrónica.
- Prueba de funcionamiento.
- Inspección visual.

Resultado: satisfactorio, requiere revisión o no satisfactorio.

Observaciones y evidencias.

## 13. Pagos y entrega

El sistema permitirá registrar pagos completos o parciales.

- Efectivo.
- Tarjeta.
- Transferencia.
- Otro método.
- Referencia de pago.
- Monto, fecha y usuario que registró el pago.

Antes de cerrar una entrega se podrá comprobar total, pagos acumulados y saldo.

## 14. Portal del cliente

El portal estará aislado del panel administrativo. Contenido disponible:

- Mis vehículos.
- Estado actual del servicio.
- Falla reportada y diagnóstico.
- Reparaciones registradas.
- Cotizaciones y autorización.
- Evidencias marcadas como visibles.
- Actualizaciones del servicio.
- Fecha estimada de entrega.
- Historial de servicios.
- Próximas citas.

Se contempla como opción un acceso mediante folio y código temporal o mediante un código QR asociado a la orden.

## 15. Actualizaciones al cliente

Además del estado general, el administrador podrá publicar actualizaciones breves, por ejemplo: "El diagnóstico ha finalizado" o "El vehículo se encuentra en reparación".

## 16. Historial y auditoría

El sistema conservará el historial de cambios de estado y una bitácora de acciones administrativas para saber qué usuario realizó cada modificación y cuándo.

## 17. Dashboard

El panel administrativo mostrará indicadores como:

- Vehículos actualmente en taller.
- Vehículos en diagnóstico.
- Vehículos en reparación.
- Vehículos listos para entrega.
- Citas del día.
- Cotizaciones pendientes de autorización.
- Entregas programadas.
- Alertas de órdenes demoradas.

## 18. Arquitectura tecnológica propuesta

| Capa | Tecnología propuesta |
|------|----------------------|
| Frontend | HTML, CSS, JavaScript y Bootstrap |
| Backend | ASP.NET Core con C# |
| API | REST |
| Base de datos | SQL Server |
| Acceso a datos | Entity Framework Core |
| Autenticación | ASP.NET Core Identity o mecanismo equivalente |
| Control de versiones | Git y GitHub |
| Archivos/evidencias | Almacenamiento de archivos separado de la base de datos, conservando referencias en SQL Server |

## 19. Principios de diseño

- Separar claramente el portal del cliente del panel administrativo.
- Aplicar permisos por rol.
- No almacenar contraseñas en texto plano.
- Conservar historial de estados en lugar de sobrescribirlo.
- No sobrescribir versiones anteriores de cotizaciones.
- Mantener trazabilidad de acciones importantes.
- Diseñar la base de datos para permitir crecimiento futuro.
- Validar que un cliente solamente pueda consultar sus propios vehículos y órdenes.

## 20. Funciones futuras posibles

- Notificaciones por correo.
- Integración con WhatsApp.
- Mensajería cliente-taller.
- Inventario de refacciones.
- Proveedores y compras.
- Reportes financieros.
- Facturación.
- Múltiples sucursales.
- Aplicación móvil.
- Integración con servicios externos.

## 21. Próximas etapas del proyecto

1. Definir el modelo entidad-relación completo.
2. Definir PK, FK, cardinalidades, índices y restricciones.
3. Diseñar el esquema de autenticación y autorización.
4. Definir el flujo exacto del portal del cliente y acceso por QR/código.
5. Crear el script SQL Server.
6. Diseñar endpoints/API.
7. Diseñar wireframes y pantallas.
8. Construir el proyecto base.
9. Implementar módulos por fases.
10. Realizar pruebas funcionales y de seguridad.

Documento de trabajo — sujeto a revisión conforme avance el diseño.
