import { useState } from 'react';
import UmlEditor from './components/UmlEditor';
import { UMLModel } from './types/uml';

const initialModel: UMLModel = {
  classes: [],
  relations: []
};

function App() {
  const [model, setModel] = useState<UMLModel>(initialModel);
  const [status, setStatus] = useState<string>('Prêt');

  const handleModelChange = (nextModel: UMLModel) => {
    setModel(nextModel);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(model, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'uml-model.json';
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus('Modèle exporté en JSON');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-700 bg-slate-900/90 px-6 py-4 shadow-uml">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">IDM UML Platform</h1>
            <p className="text-sm text-slate-400">Éditeur UML MDE avec génération de code</p>
          </div>
          <button
            onClick={exportJson}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-slate-950 transition hover:bg-cyan-400"
          >
            <span>➜</span>
            Export JSON
          </button>
        </div>
      </header>
      <div className="mx-auto mt-4 max-w-7xl px-4 lg:px-6">
        <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-cyan-100 shadow-lg shadow-cyan-500/10">
          {status}
        </div>
      </div>
      <main className="mx-auto mt-6 max-w-7xl px-4 pb-8 lg:px-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 shadow-uml">
          <UmlEditor model={model} onModelChange={handleModelChange} setStatus={setStatus} />
        </section>
      </main>
    </div>
  );
}

export default App;
