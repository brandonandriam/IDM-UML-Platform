from fastapi import APIRouter, HTTPException
from uuid import uuid4
from ..schemas.uml import SaveModelRequest, ModelResponse
from ..storage import ModelStorage

router = APIRouter(prefix='/models', tags=['models'])
storage = ModelStorage()

@router.post('', response_model=ModelResponse)
def create_model(payload: SaveModelRequest):
    model = payload.model.model_dump()
    model['id'] = str(uuid4())
    saved = storage.save(model)
    return saved

@router.get('', response_model=list[ModelResponse])
def list_models():
    return storage.list()

@router.get('/{model_id}', response_model=ModelResponse)
def get_model(model_id: str):
    record = storage.get(model_id)
    if record is None:
        raise HTTPException(status_code=404, detail='Modèle non trouvé')
    return record

@router.put('/{model_id}', response_model=ModelResponse)
def update_model(model_id: str, payload: SaveModelRequest):
    updated = storage.update(model_id, payload.model.model_dump())
    if updated is None:
        raise HTTPException(status_code=404, detail='Modèle non trouvé')
    return updated

@router.delete('/{model_id}')
def delete_model(model_id: str):
    removed = storage.delete(model_id)
    if not removed:
        raise HTTPException(status_code=404, detail='Modèle non trouvé')
    return {'deleted': True}
