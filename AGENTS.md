# 🤖 Guía de Comportamiento para Agentes (Antigravity)

## ⚡ Modo Autónomo de Despliegue (Autorizado por el usuario)
El usuario ha autorizado expresamente la ejecución y despliegue autónomo de punta a punta en el chat sin requerir preguntas ni pausas intermedias de confirmación, siempre que se cumpla la validación técnica rigurosa.

### Flujo de Trabajo Autónomo Obligatorio:
1. **Desarrollo y Testing Local:**
   - Realizar los cambios de código siguiendo Clean Code.
   - Ejecutar y verificar los tests unitarios (`vitest run` en `frontend/` y `python -m unittest discover tests` en `backend/`).
   - Compilar el proyecto (`npm run build`).
2. **Git Commit y Push Automático:**
   - Una vez superados todos los tests y el build, hacer commit semántico y `git push origin main`.
3. **Despliegue y Verificación en Dokploy (Raspberry Pi):**
   - Disparar el despliegue automático del backend/frontend en Dokploy mediante su API.
   - Verificar que los contenedores queden en estado `running (Up)` y que el endpoint `/health` responda `HTTP 200`.
4. **Reporte Final al Usuario:**
   - Resumir de forma concisa lo implementado, probado y desplegado en producción.
