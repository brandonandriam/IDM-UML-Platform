# Backend FastAPI IDM UML

Service backend pour gérer les modèles UML, exposer les endpoints CRUD et générer du code Java/Python.

## Installation

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API

- `POST /models` : créer un nouveau modèle UML
- `GET /models` : lister tous les modèles
- `GET /models/{id}` : lire un modèle
- `PUT /models/{id}` : mettre à jour un modèle
- `DELETE /models/{id}` : supprimer un modèle
- `POST /generate/java` : générer un ZIP Java
- `POST /generate/python` : générer un ZIP Python
- `POST /generate/all` : générer tous les langages disponibles
