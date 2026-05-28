from fastapi import APIRouter, Response
from ..models.uml import UMLModel
from ..services.generation import generate_code, generate_all

router = APIRouter(prefix='/generate', tags=['generation'])

@router.post('/java')
def generate_java(model: UMLModel):
    archive_bytes = generate_code(model, 'java')
    return Response(content=archive_bytes, media_type='application/zip')

@router.post('/python')
def generate_python(model: UMLModel):
    archive_bytes = generate_code(model, 'python')
    return Response(content=archive_bytes, media_type='application/zip')

@router.post('/all')
def generate_all_models(model: UMLModel):
    archive_bytes = generate_all(model)
    return Response(content=archive_bytes, media_type='application/zip')
