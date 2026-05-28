# IDM UML Platform

Plateforme IDM/MDE pour la modélisation UML et la génération de code.

## Architecture

- `frontend/` : React + Tailwind + React Flow pour l'éditeur UML
- `backend/` : FastAPI, Pydantic, moteur de génération et gestion de modèle
- `mde/` : métamodèle EMF `.ecore`, configuration Sirius `.odesign`, modèles Acceleo `.mtl`
- `docs/` : documentation technique

## Installation

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Docker

```bash
docker-compose up --build
```

## Endpoints

- `POST /models`
- `GET /models`
- `GET /models/{id}`
- `PUT /models/{id}`
- `DELETE /models/{id}`
- `POST /generate/java`
- `POST /generate/python`
- `POST /generate/all`

## Features

- éditeur de diagramme de classes UML
- gestion d'attributs, méthodes, héritage, relations, cardinalités
- sauvegarde JSON et export XMI
- génération de code Java/Python
- architecture IDM: métamodèle, modèle, transformations, génération
