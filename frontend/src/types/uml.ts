export type Visibility = 'public' | 'private' | 'protected' | 'package';

export type RelationType = 'association' | 'inheritance' | 'aggregation' | 'composition';

export interface UMLAttribute {
  id: string;
  name: string;
  type: string;
  visibility: Visibility;
  multiplicity: string;
}

export interface UMLMethodParameter {
  id: string;
  name: string;
  type: string;
}

export interface UMLMethod {
  id: string;
  name: string;
  returnType: string;
  visibility: Visibility;
  parameters: UMLMethodParameter[];
}

export interface UMLClass {
  id: string;
  name: string;
  visibility: Visibility;
  isAbstract: boolean;
  attributes: UMLAttribute[];
  methods: UMLMethod[];
}

export interface UMLRelation {
  id: string;
  source: string;
  target: string;
  type: RelationType;
  cardinality: string;
}

export interface UMLModel {
  classes: UMLClass[];
  relations: UMLRelation[];
}

export interface BackendSavedModel {
  id: string;
  name: string;
  model: UMLModel;
  createdAt: string;
}
