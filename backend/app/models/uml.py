from typing import List, Literal
from pydantic import BaseModel, Field

Visibility = Literal['public', 'private', 'protected', 'package']
RelationType = Literal['association', 'inheritance', 'aggregation', 'composition']

class UMLAttribute(BaseModel):
    id: str
    name: str
    type: str
    visibility: Visibility = 'public'
    multiplicity: str = '1'

class UMLMethodParameter(BaseModel):
    id: str
    name: str
    type: str

class UMLMethod(BaseModel):
    id: str
    name: str
    returnType: str = 'void'
    visibility: Visibility = 'public'
    parameters: List[UMLMethodParameter] = Field(default_factory=list)

class UMLClass(BaseModel):
    id: str
    name: str
    visibility: Visibility = 'public'
    isAbstract: bool = False
    attributes: List[UMLAttribute] = Field(default_factory=list)
    methods: List[UMLMethod] = Field(default_factory=list)

class UMLRelation(BaseModel):
    id: str
    source: str
    target: str
    type: RelationType
    cardinality: str = '1'

class UMLModel(BaseModel):
    classes: List[UMLClass] = Field(default_factory=list)
    relations: List[UMLRelation] = Field(default_factory=list)
