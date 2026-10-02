# ⚽ RFEF Tracker (Monorepo)

Monorepo ligero orientado a la aplicación móvil PWA de seguimiento de competiciones y partidos de la RFEF / RFFM.

## 🏗️ Arquitectura

- **`backend/`**: API REST intermedia construida con **Python 3.12** y **FastAPI**. Diseñada para desplegarse como Web Service gratuito en **Render**.
- **`frontend/`**: Progressive Web App (PWA) móvil responsiva construida con **React**, **TypeScript**, **Vite** y **Tailwind CSS**. Preparada para desplegarse en **Vercel** e instalarse en iOS (Safari) y Android (Chrome).

---

## 🚀 Puesta en marcha en Local

### 1. Requisitos Previos
- **Node.js** >= 18.x
- **Python** >= 3.10

---

### 2. Backend (FastAPI)

```bash
# Acceder al directorio
cd backend

# Crear y activar entorno virtual
python -m venv .venv

# En Windows (PowerShell):
.venv\Scripts\Activate.ps1
# En Linux/macOS:
# source .venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Ejecutar servidor de desarrollo
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Documentación interactiva Swagger: [http://localhost:8000/docs](http://localhost:8000/docs)
- Endpoint de salud: [http://localhost:8000/health](http://localhost:8000/health)
- API de temporadas (RFFM): [http://localhost:8000/api/seasons](http://localhost:8000/api/seasons)
- API de tipos de juego (RFFM): [http://localhost:8000/api/game-types](http://localhost:8000/api/game-types)
- API de competiciones (RFFM): [http://localhost:8000/api/competitions?temporada=22&tipojuego=2](http://localhost:8000/api/competitions?temporada=22&tipojuego=2)
- API de grupos (RFFM): [http://localhost:8000/api/groups?competicion=26737828](http://localhost:8000/api/groups?competicion=26737828)
- API de calendario por jornada: [http://localhost:8000/api/calendario?temporada=22&tipojuego=1&competicion=26737751&grupo=26737755](http://localhost:8000/api/calendario?temporada=22&tipojuego=1&competicion=26737751&grupo=26737755)
- API de partidos: [http://localhost:8000/api/partidos](http://localhost:8000/api/partidos)

---

### 3. Frontend (PWA Vite + React)

```bash
# Acceder al directorio
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

- Acceso web: [http://localhost:3000](http://localhost:3000)
- Configuración de API en `frontend/.env`:
  ```env
  VITE_API_URL=http://localhost:8000
  ```

---

## ⚡ Arranque Simultáneo (Concurrente)

Puedes ejecutar ambos servicios en terminales separadas, o usando un script en la raíz si lo prefieres:

- **Terminal 1:** `cd backend && uvicorn app.main:app --reload --port 8000`
- **Terminal 2:** `cd frontend && npm run dev`

---

## ☁️ Guía de Despliegue

### Backend en Render (Free Web Service)
1. Conecta el repositorio en Render.
2. Root Directory: `backend`
3. Environment: `Python 3`
4. Build Command: `pip install -r requirements.txt`
5. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Health Check Path: `/health`

### Frontend en Vercel
1. Conecta el repositorio en Vercel.
2. Root Directory: `frontend`
3. Framework Preset: `Vite`
4. Environment Variable: `VITE_API_URL` apuntando a la URL de tu API en Render.
5. El archivo `vercel.json` ya incluye la regla de rewrites SPA hacia `/index.html`.
