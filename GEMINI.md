# Instrucciones del Proyecto Droguería El Olam

## 1. Idioma Obligatorio
- **Todas las comunicaciones, respuestas, explicaciones y preguntas interactivas (incluyendo las ventanas modales de selección múltiple o confirmación) deben ser formuladas 100% en español.**
- Las opciones que se le presentan al usuario para seleccionar deben estar redactadas en español.
- Todos los textos de la interfaz, botones y reportes deben estar en español.

## 2. Flujo de Trabajo en Desarrollo y Publicación
- **Desarrollo en Localhost:** Trabajar e implementar todas las funciones directamente en `localhost:3000` con total autonomía (ejecutar comandos, modificar archivos, compilar y probar sin pedir permisos molestos).
- **Publicación a la Red (GitHub y Vercel):** Se procederá a subir a GitHub y desplegar en Vercel únicamente cuando el usuario lo solicite expresamente (ej: "publícalo").

## 3. Protocolo de Persistencia y Continuidad de Ideas (Cierre Forzado / Reinicio)
- **Regla de Inicio de Sesión:** Cada vez que el usuario inicie una nueva sesión, vuelva a abrir el asistente tras un reinicio de equipo o cierre forzado, la IA **DEBE** revisar inmediatamente esta bitácora y recapitularle al usuario exactamente dónde quedó el hilo de trabajo, qué se implementó recientemente y qué pasos siguen, asegurando que **nunca se pierda el hilo de las ideas**.
- **Regla de Auto-Actualización:** La IA debe actualizar esta sección en `GEMINI.md` cada vez que se culmine una tarea importante, se tome una decisión arquitectónica o cambie el rumbo del trabajo.

## 4. Bitácora Activa del Proyecto y Estado Actual
- **Última Actualización:** 08 de Octubre de 2026.
- **Rama Git Actual:** `main` (sincronizada con GitHub: `https://github.com/DrogueriaElOlam/Control-de-Visitas.git`).
- **URL Oficial de Producción en Vercel:** `https://control-de-visitas-pi.vercel.app/`
- **Pila Tecnológica:** React + Vite, Supabase (`zqwjhmiavxhswgbgejzx.supabase.co`), Vercel, Tailwind / Vanilla CSS, APK Android para rastreo GPS en segundo plano.
- **Últimos Avances Implementados:**
  1. **Rastreo GPS en Tiempo Real:** Transmisión directa desde la app móvil a Supabase (`vendor_locations`), autoinicio con `BootReceiver` y `AlarmManager` para resistir cierres del sistema Android.
  2. **Deduplicación de Vendedores:** Normalización canónica de nombres (`Ana Lucia Marroquin` sin tildes, `Dany Peres` con 's') en base de datos, filtros de vista grupal y todos los formularios del sistema.
  3. **Seguridad y Accesos:** Clave maestra de administrador, sistema de claves desechables de un solo uso (OTP) descargables en Excel, y control de baja laboral que conserva el historial de visitas.
  4. **Autonomía del Administrador:** Confirmado que las operaciones de crear, editar, dar de baja o reactivar vendedores surten efecto inmediato directamente en Supabase sin necesidad de intervención manual de código.
  5. **Depuración y Puntos de Prueba Limpios:** Eliminadas visitas y recorridos de prueba de Josué Aguilar y Elio Caceros de Supabase; verificado protocolo de cierre de sesión en app móvil y limpieza de memoria en el dispositivo para transmisión satelital limpia al instalar en teléfonos definitivos.
  6. **Auto-Purga de Memoria Local y Resolución de 404:** Implementada limpieza automática al iniciar la app que erradica visitas y pings de prueba huérfanos de `localStorage`, sincronización estricta con Supabase que no revive datos eliminados de la nube, remoción de consultas a tablas inexistentes (eliminando el error 404) y botón interactivo 'Limpiar Pruebas' en la barra de control del mapa.
  7. **Panel Central de Supervisión en Formularios:** Integrado el componente oficial 'Panel Central de Supervisión' (Compromisos de Venta Diaria de 11 vendedores con total acumulado Q17,773,042.50, Gráfica General de Ventas y Gráfica General de Cobros, pestañas de KPIs y Registros, y exportación HTML) ubicado de primero en el módulo oficial de Formularios de Droguería El Olam, y retirado del panel de control general para mantener la interfaz limpia.
  8. **Alimentación Dinámica desde Registros, Deduplicación Estricta y Vaciado Diario:** Corregido el selector de vendedores eliminando duplicados (11 vendedores canónicos oficiales), concentración de los registros reales de visitas en la pestaña 'Registros', alimentación reactiva del 'Dashboard KPIs' a partir de dichos registros (calculando alcance de ventas, cobros y % de cumplimiento), persistencia del compromiso de venta diaria con soporte para consultas históricas individuales y grupales, y función de vaciado diario a Supabase.
  9. **Exclusividad del Panel Central para Administrador y Limpieza Total tras Registro:** Retirado el 'Panel Central de Supervisión' del área y vista de vendedores (ahora restringido estrictamente al Administrador y Superusuario tanto en selector de pestañas como en renderizado). Optimizado el formulario de visitas para vendedores con `resetFormComplete()` que devuelve todos los campos en blanco (código, nombre, teléfonos, ventas, cobros desglosados, observaciones) inmediatamente después de enviar un registro, dejándolo listo para el siguiente.
  10. **Blindaje de Confidencialidad y Redacción en Modal de Cierre de Sesión:** Corregido el mensaje de alerta al intentar desloguearse en campo; se eliminó por completo la exposición de la contraseña en el texto de error de la pantalla. Asimismo, se suprimió la frase sobre cese de emisión de ubicación satelital, anteponiendo limpiamente el nombre del vendedor al mensaje de requerimiento de autorización de supervisor.
  11. **Ruta y Meta Diaria Opcionales y Ocultas para Vendedores:** Se retiró la obligatoriedad de 'Ruta Asignada' y 'Meta Diaria de Visitas' en la creación y edición de vendedores (ahora opcionales con opción 'Sin ruta asignada' y metas vacías permitidas). Asimismo, se ocultaron por completo de la vista del usuario vendedor (se removió 'Ruta: ...' del encabezado de su perfil, y se eliminaron las pestañas y botones de 'Mi Meta Diaria' y 'Resumen por Ruta' de su navegación y listados).
  12. **Detección, Resaltado y Depuración Inteligente de Clientes Duplicados:** Implementado sistema de completitud de campos (código, nombre, teléfono y ruta). En la carga masiva de Excel, se identifican duplicados en vista previa y se filtran conservando únicamente los registros con todos los campos necesarios. En el Directorio Maestro de Clientes, se agregaron píldoras de filtro rápido ('Todos', '⚠️ Duplicados', 'Incompletos'), alerta interactiva con conteo de códigos repetidos, resaltado visual de filas duplicadas con badge individual, eliminación individual precisa sin borrar registros homónimos válidos y botón de 'Depuración Automática' con unificación inteligente.
  13. **Resolución de Pantalla en Blanco en Carga Masiva y Directorio de Clientes:** Corregida la ausencia de importaciones de los hooks de React (`useState`, `useEffect`, `useRef`, `useMemo`) y de la librería `XLSX` en `AdminClientDirectoryModal.jsx`, lo cual provocaba un fallo de ejecución que dejaba la pantalla blanca al abrir el modal.
  14. **Sector Visitado Independiente a la par de Ruta:** En Registro de Visitas se retiró 'Sector' del título para dejar 'Ruta *' y se agregó a su par el nuevo campo llenable 'Sector Visitado'. En la plantilla descargable de Excel se incorporó 'Sector Visitado' al lado de 'Ruta'. En Carga Masiva y en el Directorio Maestro de Clientes se integró la columna 'Sector Visitado' a la par de 'Ruta', con soporte en vista previa, edición y guardado manual.
- **Hilo de Ideas en Curso:**
  - Garantizar la recuperación total de contexto ante reinicios repentinos o cierres forzados del equipo del usuario.
  - Mantener la bitácora viva para que la IA retome exactamente en el punto donde se suspendió la sesión previa.
- **Próximos Pasos Disponibles:**
  - Continuar con mejoras operativas solicitadas por el usuario en el panel administrativo o formularios de campo.
  - Implementar o refinar reportes, liquidaciones de viáticos o monitoreo de rutas según requerimientos.

