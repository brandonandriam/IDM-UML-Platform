from datetime import datetime
from pydantic import BaseModel
from typing import List
from ..models.uml import UMLModel

class SaveModelRequest(BaseModel):
    model: UMLModel

class ModelResponse(BaseModel):
    id: str
    name: str
    model: UMLModel
    createdAt: datetime

class GenerateResponse(BaseModel):
    filename: str
    language: str
    generatedAt: datetime
