import json
from pathlib import Path
from datetime import datetime
from uuid import uuid4
from .core.config import DATA_DIR

class ModelStorage:
    def __init__(self) -> None:
        self.path = DATA_DIR
        self.path.mkdir(exist_ok=True)

    def _model_file(self, model_id: str) -> Path:
        return self.path / f'{model_id}.json'

    def save(self, model: dict, name: str | None = None) -> dict:
        model_id = model.get('id', str(uuid4()))
        file_path = self._model_file(model_id)
        payload = {
            'id': model_id,
            'name': name or f'UML-{model_id[:8]}',
            'model': model,
            'createdAt': datetime.utcnow().isoformat() + 'Z'
        }
        file_path.write_text(json.dumps(payload, indent=2), encoding='utf-8')
        return payload

    def list(self) -> list[dict]:
        return [json.loads(path.read_text(encoding='utf-8')) for path in sorted(self.path.glob('*.json'))]

    def get(self, model_id: str) -> dict | None:
        file_path = self._model_file(model_id)
        if not file_path.exists():
            return None
        return json.loads(file_path.read_text(encoding='utf-8'))

    def update(self, model_id: str, model: dict) -> dict | None:
        file_path = self._model_file(model_id)
        if not file_path.exists():
            return None
        payload = {
            'id': model_id,
            'name': f'UML-{model_id[:8]}',
            'model': model,
            'createdAt': datetime.utcnow().isoformat() + 'Z'
        }
        file_path.write_text(json.dumps(payload, indent=2), encoding='utf-8')
        return payload

    def delete(self, model_id: str) -> bool:
        file_path = self._model_file(model_id)
        if file_path.exists():
            file_path.unlink()
            return True
        return False
