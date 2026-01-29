import React, { useState, useEffect, useMemo } from 'react';
import { RawWaterData, TargetWaterData, PlantData, CalculationResults, LogEntry } from './types';
import { calculateSoftening } from './utils/calculations';
import InputSection from './components/InputSection';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const DEFAULT_RAW: RawWaterData = {
  ph: 7.8,
  conductivity: 450,
  calcium: 180,
  magnesium: 60,
  totalHardness: 240,
  alkalinity: 120,
};

const DEFAULT_TARGET: TargetWaterData = {
  calcium: 60,
  magnesium: 10,
  totalHardness: 70,
};

const DEFAULT_PLANT: PlantData = {
  dailyFlow: 10,
  clarifierCount: 2,
  hlr: 1.5,
  solidsLoadingRate: 5.0,
  sodaAshEnabled: false,
};

const App: React.FC = () => {
  const [raw, setRaw] = useState<RawWaterData>(DEFAULT_RAW);
  const [target, setTarget] = useState<TargetWaterData>(DEFAULT_TARGET);
  const [plant, setPlant] = useState<PlantData>(DEFAULT_PLANT);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [logLabel, setLogLabel] = useState("");

  useEffect(() => {
    try {
      const savedLogs = localStorage.getItem('aquasoft_logs');
      if (savedLogs) setLogs(JSON.parse(savedLogs));
    } catch (e) {
      console.warn("Could not load history", e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('aquasoft_logs', JSON.stringify(logs));
  }, [logs]);

  const results = useMemo(() => {
    try {
      return calculateSoftening(raw, target, plant);
    } catch (e) {
      console.error("Calculation logic failed", e);
      return null;
    }
  }, [raw, target, plant]);

  if (!results) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8 bg-white shadow-xl rounded-2xl border border-slate-200">
          <i className="fa-solid fa-triangle-exclamation text-4xl text-amber-500 mb-4"></i>
          <h2 className="text-xl font-bold text-slate-800">Calculation Engine Offline</h2>
          <p className="text-slate-500 mt-2">Please check your water quality inputs for valid numerical values.</p>
        </div>
      </div>
    );
  }

  const saveCurrentLog = () => {
    const id = Math.random().toString(36).substring(2, 11);
    const newLog: LogEntry = {
      id,
      timestamp: new Date().toISOString(),
      label: logLabel || `Scenario ${new Date().toLocaleTimeString()}`,
      raw: { ...raw },
      target: { ...target },
      plant: { ...plant },
      results: { ...results }
    };
    setLogs([newLog, ...logs]);
    setLogLabel("");
    alert("Scenario archived in local history.");
  };

  const handleRefresh = () => {
    if (confirm("Reset to engineering defaults?")) {
      setRaw(DEFAULT_RAW);
      setTarget(DEFAULT_TARGET);
      setPlant(DEFAULT_PLANT);
      setLogLabel("");
    }
  };

  const loadLog = (log: LogEntry) => {
    setRaw(log.raw);
    setTarget(log.target);
    setPlant(log.plant);
    setIsHistoryOpen(false);
  };

  const deleteLog = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLogs(logs.filter(l => l.id !== id));
  };

  const handleRawChange = (field: keyof RawWaterData, val: string) => {
    const num = parseFloat(val) || 0;
    setRaw(prev => {
      const next = { ...prev, [field]: num };
      if (field === 'calcium' || field === 'magnesium') {
        next.totalHardness = next.calcium + next.magnesium;
      }
      return next;
    });
  };

  const handleTargetChange = (field: keyof TargetWaterData, val: string) => {
    const num = parseFloat(val) || 0;
    setTarget(prev => {
      const next = { ...prev, [field]: num };
      if (field === 'calcium' || field === 'magnesium') {
        next.totalHardness = next.calcium + next.magnesium;
      }
      return next;
    });
  };

  const handlePlantChange = (field: keyof PlantData, val: string | boolean) => {
    setPlant(prev => ({ ...prev, [field]: typeof val === 'string' ? parseFloat(val) || 0 : val }));
  };

  const chartData = [
    { name: 'Raw', Ca: raw.calcium, Mg: raw.magnesium },
    { name: 'Target', Ca: target.calcium, Mg: target.magnesium },
    { name: 'Final', Ca: results.achieved.calcium, Mg: results.achieved.magnesium },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 selection:bg-blue-100">
      <nav className="bg-blue-700 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-lg"><i className="fa-solid fa-droplet"></i></div>
            <h1 className="text-xl font-bold tracking-tight">AquaSoft Pro <span className="font-light text-blue-200 text-sm opacity-60">v2.1</span></h1>
          </div>
          <div className="flex gap-4">
            <button onClick={handleRefresh} className="px-4 py-2 bg-blue-800 hover:bg-blue-900 rounded-lg text-sm font-semibold border border-blue-600 transition flex items-center gap-2">
              <i className="fa-solid fa-rotate"></i> Reset
            </button>
            <button onClick={() => setIsHistoryOpen(true)} className="px-4 py-2 bg-blue-800 hover:bg-blue-900 rounded-lg text-sm font-semibold border border-blue-600 transition flex items-center gap-2">
              <i className="fa-solid fa-database"></i> History ({logs.length})
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Softening Assessment</h2>
            <p className="text-slate-500 mt-1 text-sm font-medium uppercase tracking-widest">Stoichiometry & Plant Design</p>
          </div>
          <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 transition-all">
            <input type="text" placeholder="Scenario name..." value={logLabel} onChange={(e) => setLogLabel(e.target.value)} className="px-4 py-2 text-sm border-none focus:ring-0 outline-none w-48 font-medium" />
            <button onClick={saveCurrentLog} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-200 transition active:scale-95 flex items-center gap-2">
              <i className="fa-solid fa-cloud-arrow-up"></i> Save
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-8">
            <InputSection title="Raw Water Quality" icon="fa-flask-vial">
              <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">pH Units</label><input type="number" step="0.1" value={raw.ph} onChange={e => handleRawChange('ph', e.target.value)} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" /></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Ca (mg/L CaCO₃)</label><input type="number" value={raw.calcium} onChange={e => handleRawChange('calcium', e.target.value)} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" /></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Mg (mg/L CaCO₃)</label><input type="number" value={raw.magnesium} onChange={e => handleRawChange('magnesium', e.target.value)} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" /></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Alk (mg/L CaCO₃)</label><input type="number" value={raw.alkalinity} onChange={e => handleRawChange('alkalinity', e.target.value)} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" /></div>
            </InputSection>

            <InputSection title="Target Water Quality" icon="fa-bullseye">
              <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Target Ca</label><input type="number" value={target.calcium} onChange={e => handleTargetChange('calcium', e.target.value)} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" /></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Target Mg</label><input type="number" value={target.magnesium} onChange={e => handleTargetChange('magnesium', e.target.value)} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" /></div>
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex items-center gap-3">
                <i className="fa-solid fa-circle-info text-blue-500"></i>
                <p className="text-[10px] text-blue-800 leading-tight">Define your required effluent hardness to calculate chemical dosages.</p>
              </div>
            </InputSection>

            <InputSection title="Plant Design & Hydraulics" icon="fa-industry">
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase block text-blue-800">Use Soda Ash?</span>
                  <p className="text-[9px] text-blue-500">Enable for Non-Carbonate removal</p>
                </div>
                <button onClick={() => handlePlantChange('sodaAshEnabled', !plant.sodaAshEnabled)} className={`relative w-12 h-6 rounded-full transition-all shadow-inner ${plant.sodaAshEnabled ? 'bg-blue-600' : 'bg-slate-300'}`}>
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${plant.sodaAshEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
              </div>
              <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Flow (ML/d)</label><input type="number" value={plant.dailyFlow} onChange={e => handlePlantChange('dailyFlow', e.target.value)} className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" /></div>
              <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Units (#)</label><input type="number" value={plant.clarifierCount} onChange={e => handlePlantChange('clarifierCount', e.target.value)} className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" /></div>
              <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Design HLR (m/h)</label><input type="number" step="0.1" value={plant.hlr} onChange={e => handlePlantChange('hlr', e.target.value)} className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" /></div>
            </InputSection>
          </div>

          <div className="lg:col-span-5 space-y-8">
            <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
              <h3 className="text-lg font-bold mb-8 flex items-center gap-3"><i className="fa-solid fa-microscope text-blue-400"></i> Softening Performance</h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-10">
                <div>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Lime Dose</p>
                  <p className="text-3xl font-bold">{results.limeDose.toFixed(1)} <span className="text-xs font-medium text-slate-500">mg/L</span></p>
                  <p className="text-[9px] text-slate-500 uppercase mt-1">as Ca(OH)₂</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Soda Ash</p>
                  <p className="text-3xl font-bold">{results.sodaAshDose.toFixed(1)} <span className="text-xs font-medium text-slate-500">mg/L</span></p>
                  <p className="text-[9px] text-slate-500 uppercase mt-1">as Na₂CO₃</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Daily Lime</p>
                  <p className="text-3xl font-bold text-blue-400">{results.totalLimeDaily.toFixed(0)} <span className="text-xs font-medium text-blue-300">kg/d</span></p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Daily Sludge</p>
                  <p className="text-3xl font-bold text-amber-400">{results.totalSludgeDaily.toFixed(0)} <span className="text-xs font-medium text-amber-300">kg/d</span></p>
                  <p className="text-[9px] text-slate-500 uppercase mt-1">dry mass</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Process pH</p>
                  <p className="text-3xl font-bold">{results.softeningPh.toFixed(1)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Clarifier Design Check</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-slate-50">
                  <span className="text-sm font-medium text-slate-600">Total Surface Area</span>
                  <span className="text-sm font-bold">{(results.clarifierArea * plant.clarifierCount).toFixed(1)} m²</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-50">
                  <span className="text-sm font-medium text-slate-600">Unit Diameter</span>
                  <span className="text-sm font-bold">{results.clarifierDiameter.toFixed(1)} m</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-50">
                  <span className="text-sm font-medium text-slate-600">Actual HLR</span>
                  <span className="text-sm font-bold text-blue-600">{results.actualHLR.toFixed(2)} m/h</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-sm font-medium text-slate-600">Governing Load</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${results.governingParameter === 'Hydraulic' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{results.governingParameter}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Hardness Balance (mg/L)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Legend wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                    <Bar dataKey="Ca" name="Calcium" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Mg" name="Magnesium" fill="#a855f7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </main>

      {isHistoryOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsHistoryOpen(false)}></div>
          <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b flex justify-between items-center bg-blue-50/50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><i className="fa-solid fa-clock-rotate-left text-blue-600"></i> Scenario History</h2>
              <button onClick={() => setIsHistoryOpen(false)} className="w-10 h-10 rounded-full hover:bg-white transition flex items-center justify-center text-slate-400 hover:text-slate-600"><i className="fa-solid fa-xmark text-xl"></i></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {logs.length === 0 ? (
                <div className="text-center py-20">
                  <i className="fa-solid fa-folder-open text-4xl text-slate-200 mb-4"></i>
                  <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No saved scenarios.</p>
                </div>
              ) : logs.map(log => (
                <div key={log.id} onClick={() => loadLog(log)} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl hover:border-blue-400 hover:shadow-xl transition cursor-pointer relative group">
                  <button onClick={(e) => deleteLog(log.id, e)} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition p-1"><i className="fa-solid fa-trash-can"></i></button>
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-1">{new Date(log.timestamp).toLocaleDateString()}</p>
                  <h4 className="font-bold text-slate-800 text-lg mb-2">{log.label}</h4>
                  <div className="flex gap-4 text-xs font-medium text-slate-500">
                    <span className="flex items-center gap-1"><i className="fa-solid fa-water"></i> {log.plant.dailyFlow} ML/d</span>
                    <span className="flex items-center gap-1"><i className="fa-solid fa-flask"></i> {log.results.limeDose.toFixed(1)} mg/L</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 py-3 text-center text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        AquaSoft Pro | Engineering Assessment Utility | All Units SI
      </footer>
    </div>
  );
};

export default App;
