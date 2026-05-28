from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import models, generate

app = FastAPI(
    title='IDM UML Platform API',
    description='Backend API pour la gestion des modèles UML et la génération de code',
    version='0.1.0'
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*']
)

app.include_router(models.router)
app.include_router(generate.router)

@app.get('/')
def root():
    return {'message': 'IDM UML Platform API en service'}
