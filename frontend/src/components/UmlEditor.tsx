import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  Background,
  Controls,
  MiniMap,
  Node,
  Connection,
  Edge,
  MarkerType,
  useEdgesState,
  useNodesState
} from 'reactflow';
import 'reactflow/dist/style.css';
import JSZip from 'jszip';
import { v4 as uuid } from 'uuid';
import { RelationType, UMLAttribute, UMLClass, UMLMethod, UMLMethodParameter, UMLModel, UMLRelation, Visibility } from '../types/uml';
import { createModel, generateJava, generatePython } from '../services/api';

interface UmlEditorProps {
  model: UMLModel;
  onModelChange: (model: UMLModel) => void;
  setStatus: (value: string) => void;
}

const defaultVisibility: Visibility = 'public';
const relationLabels: Record<RelationType, string> = {
  association: 'assoc',
  inheritance: 'extends',
  aggregation: 'agg',
  composition: 'comp'
};

const cardinalityOptions = ['1', '0..1', '1..*', '0..*'];
const typeOptions = ['String', 'int', 'float', 'bool', 'double', 'datetime'];

const transformModelToElements = (model: UMLModel): { nodes: Node[]; edges: Edge[] } => {
  const nodes = model.classes.map((cls, index) => ({
    id: cls.id,
    position: { x: 100 + index * 220, y: 80 + (index % 3) * 180 },
    data: { label: cls.name, class: cls },
    type: 'default',
    style: {
      width: 240,
      padding: 10,
      borderRadius: 16,
      border: '1px solid #334155',
      background: '#0f172a',
      color: '#f8fafc'
    }
  }));

  const edges = model.relations.map((relation) => ({
    id: relation.id,
    source: relation.source,
    target: relation.target,
    type: 'smoothstep',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#38bdf8'
    },
    data: { label: `${relationLabels[relation.type]} ${relation.cardinality}` },
    label: `${relationLabels[relation.type]} ${relation.cardinality}`,
    animated: false,
    style: { stroke: '#38bdf8' }
  }));

  return { nodes, edges };
};

const createEmptyClass = (): UMLClass => ({
  id: uuid(),
  name: 'NewClass',
  visibility: defaultVisibility,
  isAbstract: false,
  attributes: [],
  methods: []
});

const createEmptyAttribute = (): UMLAttribute => ({
  id: uuid(),
  name: 'attribute',
  type: 'String',
  visibility: defaultVisibility,
  multiplicity: '1'
});

const createEmptyMethod = (): UMLMethod => ({
  id: uuid(),
  name: 'operation',
  returnType: 'void',
  visibility: defaultVisibility,
  parameters: []
});

const removeAttributeFromClass = (cls: UMLClass, attributeId: string): UMLClass => ({
  ...cls,
  attributes: cls.attributes.filter((attr) => attr.id !== attributeId)
});

const removeMethodFromClass = (cls: UMLClass, methodId: string): UMLClass => ({
  ...cls,
  methods: cls.methods.filter((method) => method.id !== methodId)
});

const parseJavaCode = (content: string) => {
  const classes: UMLClass[] = [];
  let current: { cls: UMLClass; extendsName?: string } | null = null;
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const classMatch = line.match(/(?:public\s+)?(?:abstract\s+)?class\s+([A-Za-z_][A-Za-z0-9_]*)/);
    if (classMatch) {
      if (current) {
        classes.push(current.cls);
      }
      const className = classMatch[1];
      const isAbstract = /abstract\s+class/.test(line);
      const extendsMatch = line.match(/extends\s+([A-Za-z_][A-Za-z0-9_]*)/);
      current = {
        cls: {
          id: uuid(),
          name: className,
          visibility: 'public',
          isAbstract,
          attributes: [],
          methods: []
        },
        extendsName: extendsMatch?.[1]
      };
      continue;
    }

    if (!current) {
      continue;
    }

    const fieldMatch = line.match(/(?:public|protected|private)\s+([A-Za-z0-9_<>\[\]]+)\s+([A-Za-z_][A-Za-z0-9_]*)\s*;/);
    if (fieldMatch && !/\bstatic\b/.test(line)) {
      current.cls.attributes.push({
        id: uuid(),
        name: fieldMatch[2],
        type: fieldMatch[1],
        visibility: 'private',
        multiplicity: '1'
      });
      continue;
    }

    const methodMatch = line.match(/(?:public|protected|private)\s+([A-Za-z0-9_<>\[\]]+)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)/);
    if (methodMatch) {
      const methodName = methodMatch[2];
      if (methodName === current.cls.name) {
        continue;
      }
      const params = methodMatch[3]
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)
        .map((param) => {
          const parts = param.split(/\s+/);
          return {
            id: uuid(),
            name: parts[parts.length - 1] ?? 'arg',
            type: parts.slice(0, -1).join(' ') || 'Object'
          };
        });
      current.cls.methods.push({
        id: uuid(),
        name: methodName,
        returnType: methodMatch[1],
        visibility: 'public',
        parameters: params
      });
      continue;
    }
  }

  if (current) {
    classes.push(current.cls);
  }

  return classes;
};

const parsePythonCode = (content: string) => {
  const classes: UMLClass[] = [];
  let current: UMLClass | null = null;
  let inInit = false;
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const classMatch = line.match(/^class\s+([A-Za-z_][A-Za-z0-9_]*)\s*[:(]/);
    if (classMatch) {
      if (current) {
        classes.push(current);
      }
      current = {
        id: uuid(),
        name: classMatch[1],
        visibility: 'public',
        isAbstract: false,
        attributes: [],
        methods: []
      };
      inInit = false;
      continue;
    }

    if (!current) {
      continue;
    }

    const initMatch = line.match(/^def\s+__init__\s*\(([^)]*)\)\s*:/);
    if (initMatch) {
      inInit = true;
      continue;
    }

    if (/^def\s+[A-Za-z_][A-Za-z0-9_]*\s*\(/.test(line)) {
      inInit = false;
      const methodMatch = line.match(/^def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*(?:->\s*([A-Za-z0-9_\.]+))?\s*:/);
      if (methodMatch) {
        const methodName = methodMatch[1];
        if (methodName === '__init__') {
          continue;
        }
        const params = methodMatch[2]
          .split(',')
          .map((p) => p.trim())
          .filter((p) => p && !/^self$/.test(p))
          .map((param) => {
            const [name, type] = param.split(':').map((part) => part.trim());
            return {
              id: uuid(),
              name: name || 'arg',
              type: type || 'Any'
            };
          });
        current.methods.push({
          id: uuid(),
          name: methodName,
          returnType: methodMatch[3] || 'None',
          visibility: 'public',
          parameters: params
        });
      }
      continue;
    }

    if (inInit) {
      const attrMatch = line.match(/self\.([A-Za-z_][A-Za-z0-9_]*)\s*:?\s*([A-Za-z0-9_\.]+)?\s*=\s*/);
      if (attrMatch) {
        current.attributes.push({
          id: uuid(),
          name: attrMatch[1],
          type: attrMatch[2] || 'Any',
          visibility: 'private',
          multiplicity: '1'
        });
      }
    }
  }

  if (current) {
    classes.push(current);
  }

  return classes;
};

const parseJsonModel = (content: string): UMLModel | null => {
  try {
    const parsed = JSON.parse(content) as UMLModel;
    if (!parsed || !Array.isArray(parsed.classes) || !Array.isArray(parsed.relations)) {
      return null;
    }

    const classes = parsed.classes.map((cls) => ({
      id: cls.id || uuid(),
      name: cls.name || 'Unnamed',
      visibility: cls.visibility || 'public',
      isAbstract: cls.isAbstract ?? false,
      attributes: Array.isArray(cls.attributes)
        ? cls.attributes.map((attr) => ({
            id: attr.id || uuid(),
            name: attr.name || 'attribute',
            type: attr.type || 'String',
            visibility: attr.visibility || 'public',
            multiplicity: attr.multiplicity || '1'
          }))
        : [],
      methods: Array.isArray(cls.methods)
        ? cls.methods.map((method) => ({
            id: method.id || uuid(),
            name: method.name || 'operation',
            returnType: method.returnType || 'void',
            visibility: method.visibility || 'public',
            parameters: Array.isArray(method.parameters)
              ? method.parameters.map((param) => ({
                  id: param.id || uuid(),
                  name: param.name || 'arg',
                  type: param.type || 'Any'
                }))
              : []
          }))
        : []
    }));

    const relations = Array.isArray(parsed.relations)
      ? parsed.relations.map((relation) => ({
          id: relation.id || uuid(),
          source: relation.source,
          target: relation.target,
          type: relation.type || 'association',
          cardinality: relation.cardinality || '1'
        }))
      : [];

    return { classes, relations };
  } catch {
    return null;
  }
};

const buildModelFromFiles = async (files: { name: string; content: string }[]) => {
  let importedModel: UMLModel | null = null;
  const classes: UMLClass[] = [];

  for (const file of files) {
    const name = file.name.toLowerCase();
    if (name.endsWith('.json')) {
      const jsonModel = parseJsonModel(file.content);
      if (jsonModel) {
        importedModel = jsonModel;
        break;
      }
    } else if (name.endsWith('.java')) {
      classes.push(...parseJavaCode(file.content));
    } else if (name.endsWith('.py')) {
      classes.push(...parsePythonCode(file.content));
    }
  }

  if (importedModel) {
    return importedModel;
  }

  const uniqueClasses = classes.reduce<Record<string, UMLClass>>((acc, cls) => {
    if (!acc[cls.name]) acc[cls.name] = cls;
    return acc;
  }, {});

  return {
    classes: Object.values(uniqueClasses),
    relations: []
  } as UMLModel;
};

const UmlEditor: React.FC<UmlEditorProps> = ({ model, onModelChange, setStatus }) => {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [relationType, setRelationType] = useState<RelationType>('association');
  const [relationCardinality, setRelationCardinality] = useState('1..*');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImportClick = () => fileInputRef.current?.click();

  const importCodeModel = async (file: File) => {
    const reader = new FileReader();
    return new Promise<{ name: string; content: string }[]>((resolve, reject) => {
      reader.onerror = () => reject(reader.error);
      reader.onload = async () => {
        const result = reader.result;
        if (!result) {
          reject(new Error('Fichier vide')); 
          return;
        }
        if (file.name.toLowerCase().endsWith('.zip')) {
          const zip = await JSZip.loadAsync(result as ArrayBuffer);
          const entries: { name: string; content: string }[] = [];
          const zipFiles = Object.values(zip.files) as JSZip.JSZipObject[];
          await Promise.all(
            zipFiles
              .filter((entry) => !entry.dir && /\.(json|java|py)$/i.test(entry.name))
              .map(async (entry) => {
                const content = await entry.async('string');
                entries.push({ name: entry.name, content });
              })
          );
          resolve(entries);
        } else {
          resolve([{ name: file.name, content: result as string }]);
        }
      };
      if (file.name.toLowerCase().endsWith('.zip')) {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file, 'utf-8');
      }
    });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const files = await importCodeModel(file);
      const importedModel = await buildModelFromFiles(files);
      if (importedModel.classes.length === 0) {
        setStatus('Aucun modèle importable trouvé dans le fichier.');
        return;
      }
      onModelChange(importedModel);
      setStatus(`Modèle importé depuis ${file.name}`);
    } catch (error) {
      console.error(error);
      setStatus('Échec de l’import de code.');
    } finally {
      event.target.value = '';
    }
  };

  const modelElements = useMemo(() => transformModelToElements(model), [model]);
  const [nodes, setNodes, onNodesChange] = useNodesState(modelElements.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(modelElements.edges);

  useEffect(() => {
    setNodes(modelElements.nodes);
    setEdges(modelElements.edges);
  }, [modelElements, setNodes, setEdges]);

  const selectedClass = model.classes.find((cls) => cls.id === selectedClassId) ?? null;

  const updateModel = (nextModel: UMLModel) => {
    onModelChange(nextModel);
    setStatus('Modèle UML mis à jour');
  };

  const addClass = () => {
    const nextModel = { ...model, classes: [...model.classes, createEmptyClass()] };
    updateModel(nextModel);
  };

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const newRelation: UMLRelation = {
        id: uuid(),
        source: connection.source,
        target: connection.target,
        type: relationType,
        cardinality: relationCardinality
      };
      updateModel({ ...model, relations: [...model.relations, newRelation] });
      setEdges((eds) => addEdge(connection, eds));
    },
    [model, relationType, relationCardinality, setEdges]
  );

  const selectClass = (nodeId: string) => {
    setSelectedClassId(nodeId);
  };

  const updateActiveClass = (changes: Partial<UMLClass>) => {
    if (!selectedClassId) return;
    const nextClasses = model.classes.map((cls) => (cls.id === selectedClassId ? { ...cls, ...changes } : cls));
    updateModel({ ...model, classes: nextClasses });
  };

  const addAttribute = () => {
    if (!selectedClass) return;
    const nextClass = {
      ...selectedClass,
      attributes: [...selectedClass.attributes, createEmptyAttribute()]
    };
    updateActiveClass(nextClass);
  };

  const removeAttribute = (attributeId: string) => {
    if (!selectedClass) return;
    const nextClass = removeAttributeFromClass(selectedClass, attributeId);
    updateActiveClass(nextClass);
  };

  const addMethod = () => {
    if (!selectedClass) return;
    const nextClass = {
      ...selectedClass,
      methods: [...selectedClass.methods, createEmptyMethod()]
    };
    updateActiveClass(nextClass);
  };

  const removeMethod = (methodId: string) => {
    if (!selectedClass) return;
    const nextClass = removeMethodFromClass(selectedClass, methodId);
    updateActiveClass(nextClass);
  };

  const updateAttribute = (attributeId: string, changes: Partial<UMLAttribute>) => {
    if (!selectedClass) return;
    const nextClass = {
      ...selectedClass,
      attributes: selectedClass.attributes.map((attr) => (attr.id === attributeId ? { ...attr, ...changes } : attr))
    };
    updateActiveClass(nextClass);
  };

  const updateMethod = (methodId: string, changes: Partial<UMLMethod>) => {
    if (!selectedClass) return;
    const nextClass = {
      ...selectedClass,
      methods: selectedClass.methods.map((method) => (method.id === methodId ? { ...method, ...changes } : method))
    };
    updateActiveClass(nextClass);
  };

  const removeRelation = (id: string) => {
    updateModel({ ...model, relations: model.relations.filter((relation) => relation.id !== id) });
  };

  const saveToBackend = async () => {
    try {
      const saved = await createModel(model);
      setStatus(`Modèle sauvegardé: ${saved.id}`);
    } catch (error) {
      console.error(error);
      setStatus('Erreur lors de la sauvegarde backend');
    }
  };

  const exportCode = async (lang: 'java' | 'python') => {
    try {
      const blob = await (lang === 'java' ? generateJava(model) : generatePython(model));
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${lang}-generated.zip`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus(`Code ${lang} généré`);
    } catch (error) {
      console.error(error);
      setStatus(`Erreur génération ${lang}`);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_0.9fr]">
      <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-4 shadow-uml">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button onClick={addClass} className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-4 py-2 text-slate-950 transition hover:bg-cyan-400">
            <span>➕</span>
            Ajouter une classe
          </button>
          <button onClick={saveToBackend} className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 px-4 py-2 hover:bg-slate-800">
            <span>💾</span>
            Sauvegarder
          </button>
          <button onClick={handleImportClick} className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 px-4 py-2 hover:bg-slate-800">
            <span>📥</span>
            Importer modèle
          </button>
          <input ref={fileInputRef} type="file" accept=".json,.zip,.java,.py" onChange={handleFileChange} className="hidden" />
          <button onClick={() => exportCode('java')} className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 px-4 py-2 hover:bg-slate-800">
            <span>☕</span>
            Générer Java
          </button>
          <button onClick={() => exportCode('python')} className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 px-4 py-2 hover:bg-slate-800">
            <span>🐍</span>
            Générer Python
          </button>
        </div>
        <div className="mb-4 grid gap-2 rounded-3xl border border-slate-800 bg-slate-900 p-3">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <span>Type de relation</span>
            <select value={relationType} onChange={(event) => setRelationType(event.target.value as RelationType)} className="rounded-xl bg-slate-800 px-3 py-2 text-slate-100">
              <option value="association">Association</option>
              <option value="inheritance">Héritage</option>
              <option value="aggregation">Agrégation</option>
              <option value="composition">Composition</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <span>Cardinalité</span>
            <select value={relationCardinality} onChange={(event) => setRelationCardinality(event.target.value)} className="w-full rounded-xl bg-slate-800 px-3 py-2 text-slate-100">
              {cardinalityOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <p className="text-xs text-slate-500">Relier deux classes en faisant glisser une flèche depuis le bord droit d'une classe vers une autre.</p>
        </div>
        <div className="relative h-[720px] rounded-3xl border border-slate-800 bg-slate-950">
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_, node) => selectClass(node.id)}
              fitView
              fitViewOptions={{ padding: 0.1 }}
              connectionLineStyle={{ stroke: '#38bdf8', strokeWidth: 2 }}
              snapToGrid={true}
              snapGrid={[15, 15]}
              className="w-full h-full"
            >
              <Background color="#0f172a" gap={18} />
              <Controls showInteractive={false} />
              <MiniMap nodeStrokeColor={(node) => (node.selected ? '#38bdf8' : '#334155')} nodeColor={(node) => '#0f172a'} />
            </ReactFlow>
          </ReactFlowProvider>
          {nodes.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/80 text-slate-400">
              <div className="text-center text-sm">Aucun élément UML. Cliquez sur «Ajouter une classe» pour commencer.</div>
            </div>
          )}
        </div>
      </div>

      <aside className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950/90 p-4 shadow-uml">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
          <h2 className="text-lg font-semibold text-slate-100">Classe sélectionnée</h2>
          {!selectedClass ? (
            <p className="mt-3 text-sm text-slate-400">Cliquez sur une classe du diagramme pour éditer ses propriétés.</p>
          ) : (
            <div className="space-y-3">
              <label className="block text-sm text-slate-300">
                Nom
                <input
                  value={selectedClass.name}
                  onChange={(event) => updateActiveClass({ name: event.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100"
                />
              </label>
              <label className="block text-sm text-slate-300">
                Visibilité
                <select
                  value={selectedClass.visibility}
                  onChange={(event) => updateActiveClass({ visibility: event.target.value as Visibility })}
                  className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100"
                >
                  <option value="public">public</option>
                  <option value="private">private</option>
                  <option value="protected">protected</option>
                  <option value="package">package</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={selectedClass.isAbstract}
                  onChange={(event) => updateActiveClass({ isAbstract: event.target.checked })}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-800"
                />
                Classe abstraite
              </label>
              <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/90 p-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-100">Attributs</h3>
                  <button onClick={addAttribute} className="inline-flex items-center gap-2 rounded-2xl bg-slate-800 px-3 py-1 text-sm text-slate-200 hover:bg-slate-700">
                    <span>➕</span>
                    Ajouter
                  </button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedClass.attributes.map((attribute) => (
                    <div key={attribute.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-3 text-slate-300">
                      <div className="flex items-center justify-between gap-3">
                        <input
                          value={attribute.name}
                          onChange={(e) => updateAttribute(attribute.id, { name: e.target.value })}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
                        />
                        <button
                          onClick={() => removeAttribute(attribute.id)}
                          className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
                          type="button"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <select
                          value={attribute.type}
                          onChange={(e) => updateAttribute(attribute.id, { type: e.target.value })}
                          className="rounded-xl border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
                        >
                          {typeOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                        <select
                          value={attribute.multiplicity}
                          onChange={(e) => updateAttribute(attribute.id, { multiplicity: e.target.value })}
                          className="rounded-xl border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
                        >
                          {cardinalityOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/90 p-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-100">Méthodes</h3>
                  <button onClick={addMethod} className="inline-flex items-center gap-2 rounded-2xl bg-slate-800 px-3 py-1 text-sm text-slate-200 hover:bg-slate-700">
                    <span>➕</span>
                    Ajouter
                  </button>
                </div>
                <div className="space-y-2 max-h-44 overflow-y-auto">
                  {selectedClass.methods.map((method) => (
                    <div key={method.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-3 text-slate-300">
                      <div className="flex items-center justify-between gap-3">
                        <input
                          value={method.name}
                          onChange={(e) => updateMethod(method.id, { name: e.target.value })}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
                        />
                        <button
                          onClick={() => removeMethod(method.id)}
                          className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
                          type="button"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <select
                          value={method.returnType}
                          onChange={(e) => updateMethod(method.id, { returnType: e.target.value })}
                          className="rounded-xl border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
                        >
                          <option value="void">void</option>
                          {typeOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                        <select
                          value={method.visibility}
                          onChange={(e) => updateMethod(method.id, { visibility: e.target.value as Visibility })}
                          className="rounded-xl border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
                        >
                          <option value="public">public</option>
                          <option value="private">private</option>
                          <option value="protected">protected</option>
                          <option value="package">package</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
          <h2 className="text-lg font-semibold text-slate-100">Relations</h2>
          <div className="mt-3 space-y-2 text-sm text-slate-300">
            {model.relations.length === 0 ? (
              <p>Aucune relation définie</p>
            ) : (
              model.relations.map((relation) => (
                <div key={relation.id} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2">
                  <span>{relation.source} → {relation.target} ({relation.type}, {relation.cardinality})</span>
                  <button onClick={() => removeRelation(relation.id)} className="rounded-xl bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700">
                    Supprimer
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};

export default UmlEditor;
