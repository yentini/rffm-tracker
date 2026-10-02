# 🛡️ Política de Despliegue y Validación Local

## Regla Estricta: Prohibido publicar en producción sin confirmación previa
Antes de realizar cualquier despliegue a producción o ejecutar `git push` a la rama `main` (lo cual desencadena los despliegues automáticos en Render y Vercel), el agente DEBE:

1. **Desarrollar y probar siempre primero en entorno local:**
   - Backend en ejecución local (`http://localhost:8000`).
   - Frontend en ejecución local (`http://localhost:3000`).
   - Pasar los tests unitarios (`vitest run` y `unittest discover tests`).
   - Validar en el navegador local que la funcionalidad cumple al 100% con lo solicitado.

2. **Pedir confirmación explícita al usuario:**
   - Presentar al usuario un resumen claro de lo implementado y comprobado en local.
   - Preguntar explícitamente si desea subir y publicar los cambios en producción.
   - **NO ejecutar `git push`** ni activar despliegues en la nube bajo ninguna circunstancia sin su aprobación explícita directa.
