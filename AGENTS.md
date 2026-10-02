# 🤖 Guía de Comportamiento para Agentes (Antigravity)

## 🚨 Regla de Oro: Confirmación Previa para Producción
**NUNCA hagas `git push` a `origin main` ni publiques cambios en producción sin pedir confirmación explícita previa al usuario.**

### Flujo de Trabajo Obligatorio:
1. **Desarrollo y Testing Local:**
   - Realizar los cambios de código.
   - Ejecutar y verificar los tests unitarios (`vitest run` en `frontend/` y `python -m unittest discover tests` en `backend/`).
   - Compilar el proyecto (`npm run build`).
2. **Validación en Entorno Local:**
   - Probar y verificar la funcionalidad en `http://localhost:3000` y `http://localhost:8000`.
3. **Solicitud de Aprobación al Usuario:**
   - Informar al usuario de los cambios probados en local.
   - Pedir confirmación explícita para publicar en producción.
4. **Despliegue solo tras Confirmación:**
   - Solo cuando el usuario responda afirmativamente, se realizará el `git push origin main`.
