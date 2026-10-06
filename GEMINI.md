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
- **Última Actualización:** 06 de Octubre de 2026.
- **Rama Git Actual:** `main` (sincronizada con GitHub: `https://github.com/DrogueriaElOlam/Control-de-Visitas.git`).
- **Pila Tecnológica:** React + Vite, Supabase (`zqwjhmiavxhswgbgejzx.supabase.co`), Vercel, Tailwind / Vanilla CSS, APK Android para rastreo GPS en segundo plano.
- **Últimos Avances Implementados:**
  1. **Rastreo GPS en Tiempo Real:** Transmisión directa desde la app móvil a Supabase (`vendor_locations`), autoinicio con `BootReceiver` y `AlarmManager` para resistir cierres del sistema Android.
  2. **Deduplicación de Vendedores:** Normalización canónica de nombres (`Ana Lucia Marroquin` sin tildes, `Dany Peres` con 's') en base de datos, filtros de vista grupal y todos los formularios del sistema.
  3. **Seguridad y Accesos:** Clave maestra de administrador (`0l@m_2025$`), sistema de claves desechables de un solo uso (OTP) descargables en Excel, y control de baja laboral que conserva el historial de visitas.
  4. **Autonomía del Administrador:** Confirmado que las operaciones de crear, editar, dar de baja o reactivar vendedores surten efecto inmediato directamente en Supabase sin necesidad de intervención manual de código.
  5. **Depuración y Puntos de Prueba Limpios:** Eliminadas visitas y recorridos de prueba de Josué Aguilar y Elio Caceros de Supabase; verificado protocolo de cierre de sesión en app móvil (`0l@m_2025$`) y limpieza de memoria en el dispositivo para transmisión satelital limpia al instalar en teléfonos definitivos.
- **Hilo de Ideas en Curso:**
  - Garantizar la recuperación total de contexto ante reinicios repentinos o cierres forzados del equipo del usuario.
  - Mantener la bitácora viva para que la IA retome exactamente en el punto donde se suspendió la sesión previa.
- **Próximos Pasos Disponibles:**
  - Continuar con mejoras operativas solicitadas por el usuario en el panel administrativo o formularios de campo.
  - Implementar o refinar reportes, liquidaciones de viáticos o monitoreo de rutas según requerimientos.

