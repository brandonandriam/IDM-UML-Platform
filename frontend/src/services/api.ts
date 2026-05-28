import axios from 'axios';
import { BackendSavedModel, UMLModel } from '../types/uml';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

export const createModel = async (model: UMLModel) => {
  const response = await api.post<BackendSavedModel>('/models', { model });
  return response.data;
};

export const listModels = async () => {
  const response = await api.get<BackendSavedModel[]>('/models');
  return response.data;
};

export const getModel = async (id: string) => {
  const response = await api.get<BackendSavedModel>(`/models/${id}`);
  return response.data;
};

export const generateJava = async (model: UMLModel) => {
  const response = await api.post('/generate/java', model, { responseType: 'blob' });
  return response.data;
};

export const generatePython = async (model: UMLModel) => {
  const response = await api.post('/generate/python', model, { responseType: 'blob' });
  return response.data;
};
