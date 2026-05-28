# Documentation technique IDM UML

## Structure du projet

- `frontend/` : éditeur UML React avec React Flow et Tailwind.
- `backend/` : API FastAPI, modèles Pydantic, stockage JSON et génération de code.
- `mde/` : métamodèle EMF, configuration Sirius, templates Acceleo et exemples.

## Flux IDM / MDE

1. Métamodèle EMF : `mde/metamodel/uml.ecore`
2. Modèle UML : sauvegarde JSON / XMI depuis l'éditeur
3. Éditeur graphique : `frontend/src/components/UmlEditor.tsx`
4. Génération de code : `backend/app/services/generation.py`

## Extensions futures

- ajouter C#, TypeScript, Kotlin via `mde/acceleo`
- ajouter authentification JWT dans `backend/app/routes/auth.py`
- ajouter WebSocket collaboration
- importer/exporter PlantUML et Mermaid

## Commandes

- `npm install` puis `npm run dev` dans `frontend/`
- `python -m venv .venv` puis `pip install -r requirements.txt` dans `backend/`
- `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
- `docker-compose up --build`
