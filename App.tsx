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
  limeUnitCost: 0.25, // $0.25/kg
  sodaAshUnitCost: 0.65, // $0.65/kg
};

const App: React.FC = () => {
  const [raw, setRaw] = useState<RawWaterData>(DEFAULT_RAW);
  const [target, setTarget] = useState<TargetWaterData>(DEFAULT_TARGET);
  const [plant, setPlant] = useState<PlantData>(DEFAULT_PLANT);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [logLabel, setLogLabel] = useState("");

  useEffect(() => {
    const savedLogs = localStorage.getItem('aquasoft_logs');
    if (savedLogs) setLogs(JSON.parse(savedLogs));
  }, []);

  useEffect(() => {
    localStorage.setItem('aquasoft_logs', JSON.stringify(logs));
  }, [logs]);

  const results = useMemo(() => calculateSoftening(raw, target, plant), [raw, target, plant]);

  const saveCurrentLog = () => {
    const newLog: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      label: logLabel || `Scenario ${new Date().toLocaleTimeString()}`,
      raw: { ...raw },
      target: { ...target },
      plant: { ...plant },
      results: { ...results }
    };
    setLogs([newLog, ...logs]);
    setLogLabel("");
    alert("Scenario saved to history!");
  };

  const handleRefresh = () => {
    if (window.confirm("Reset all inputs to defaults?")) {
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
    const numVal = parseFloat(val) || 0;
    setRaw(prev => {
      const next = { ...prev, [field]: numVal };
      if (field === 'calcium' || field === 'magnesium') {
        next.totalHardness = next.calcium + next.magnesium;
      }
      return next;
    });
  };

  const handleTargetChange = (field: keyof TargetWaterData, val: string) => {
    const numVal = parseFloat(val) || 0;
    setTarget(prev => {
      const next = { ...prev, [field]: numVal };
      if (field === 'calcium' || field === 'magnesium') {
        next.totalHardness = next.calcium + next.magnesium;
      }
      return next;
    });
  };

  const handlePlantChange = (field: keyof PlantData, val: string | boolean) => {
    setPlant(prev => ({ ...prev, [field]: typeof val === 'string' ? parseFloat(val) || 0 : val }));
  };

  const targetsMet = (results.achieved.calcium <= target.calcium + 1.0) && 
                    (results.achieved.magnesium <= target.magnesium + 1.0);

  const hardnessChartData = [
    { name: 'Raw Water', Calcium: raw.calcium, Magnesium: raw.magnesium },
    { name: 'Target', Calcium: target.calcium, Magnesium: target.magnesium },
    { name: 'Achieved', Calcium: results.achieved.calcium, Magnesium: results.achieved.magnesium },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <nav className="bg-blue-700 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-droplet text-2xl"></i>
            <h1 className="text-xl font-bold tracking-tight">AquaSoft Pro <span className="font-light text-blue-200 text-sm">v1.4</span></h1>
          </div>
          <div className="flex gap-4">
            <button onClick={handleRefresh} className="flex items-center gap-2 px-4 py-2 bg-blue-800 hover:bg-blue-900 rounded-lg transition text-sm font-medium border border-blue-600">
              <i className="fa-solid fa-rotate-right"></i> Refresh
            </button>
            <button onClick={() => setIsHistoryOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-800 hover:bg-blue-900 rounded-lg transition text-sm font-medium border border-blue-600">
              <i className="fa-solid fa-clock-rotate-left"></i> History ({logs.length})
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-800">Lime Softening Assessment</h2>
            <p className="text-slate-500 mt-2 text-sm">Stoichiometric dosing and clarifier design utility using SI units.</p>
          </div>
          <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
            <input type="text" placeholder="Scenario name..." value={logLabel} onChange={(e) => setLogLabel(e.target.value)} className="px-3 py-2 text-sm border-none focus:ring-0 outline-none w-48" />
            <button onClick={saveCurrentLog} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2">
              <i className="fa-solid fa-floppy-disk"></i> Save Log
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-6">
            <InputSection title="Raw Water Quality" icon="fa-flask-vial">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">pH</label>
                <input type="number" step="0.1" value={raw.ph} onChange={e => handleRawChange('ph', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Conductivity (μS/cm)</label>
                <input type="number" value={raw.conductivity} onChange={e => handleRawChange('conductivity', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Calcium (mg/L as CaCO₃)</label>
                <input type="number" value={raw.calcium} onChange={e => handleRawChange('calcium', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Magnesium (mg/L as CaCO₃)</label>
                <input type="number" value={raw.magnesium} onChange={e => handleRawChange('magnesium', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Alkalinity (mg/L as CaCO₃)</label>
                <input type="number" value={raw.alkalinity} onChange={e => handleRawChange('alkalinity', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Total Hardness (mg/L as CaCO₃)</label>
                <input type="number" value={raw.totalHardness} onChange={e => handleRawChange('totalHardness', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </InputSection>

            <InputSection title="Target Water Quality" icon="fa-bullseye">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Target Calcium (mg/L)</label>
                <input type="number" value={target.calcium} onChange={e => handleTargetChange('calcium', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Target Magnesium (mg/L)</label>
                <input type="number" value={target.magnesium} onChange={e => handleTargetChange('magnesium', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Target Hardness (mg/L)</label>
                <input type="number" value={target.totalHardness} onChange={e => handleTargetChange('totalHardness', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </InputSection>

            <InputSection title="Chemical Economics" icon="fa-coins">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Lime Cost ($/kg)</label>
                <input type="number" step="0.01" value={plant.limeUnitCost} onChange={e => handlePlantChange('limeUnitCost', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Soda Ash Cost ($/kg)</label>
                <input type="number" step="0.01" value={plant.sodaAshUnitCost} onChange={e => handlePlantChange('sodaAshUnitCost', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex items-center gap-3 bg-blue-50 p-3 rounded-lg border border-blue-100 h-fit self-end">
                <i className="fa-solid fa-circle-info text-blue-500"></i>
                <p className="text-[10px] text-blue-700 leading-tight">These costs drive the treatment pathway optimization logic.</p>
              </div>
            </InputSection>

            <InputSection title="Plant Configuration" icon="fa-industry">
              <div className="flex flex-col justify-center bg-blue-50/50 p-4 rounded-xl border border-blue-100 col-span-1 md:col-span-2 lg:col-span-3">
                <label className="block text-[10px] font-bold text-blue-900 mb-3 tracking-widest uppercase">Softening Mode Selection</label>
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-bold ${!plant.sodaAshEnabled ? 'text-blue-700' : 'text-slate-400'}`}>LIME ONLY</span>
                  <button onClick={() => handlePlantChange('sodaAshEnabled', !plant.sodaAshEnabled)} className={`relative w-16 h-8 rounded-full transition-all shadow-md ${plant.sodaAshEnabled ? 'bg-blue-600' : 'bg-slate-300'}`}>
                    <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-lg transition-transform ${plant.sodaAshEnabled ? 'translate-x-8' : 'translate-x-0'} flex items-center justify-center`}>
                      <i className={`fa-solid ${plant.sodaAshEnabled ? 'fa-check text-blue-600' : 'fa-xmark text-slate-400'} text-[10px]`}></i>
                    </div>
                  </button>
                  <span className={`text-[11px] font-bold ${plant.sodaAshEnabled ? 'text-blue-700' : 'text-slate-400'}`}>LIME + SODA</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Daily flow (ML/d)</label>
                <input type="number" value={plant.dailyFlow} onChange={e => handlePlantChange('dailyFlow', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Units</label>
                <input type="number" value={plant.clarifierCount} onChange={e => handlePlantChange('clarifierCount', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">HLR (m/h)</label>
                <input type="number" step="0.1" value={plant.hlr} onChange={e => handlePlantChange('hlr', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </InputSection>
          </div>

          <div className="lg:col-span-5 space-y-6">
            {/* Optimization Recommendation Panel */}
            <div className={`rounded-xl border-2 p-6 shadow-md transition-all ${
              (plant.sodaAshEnabled && results.optimization.cheapestMode === 'LimeSoda') || (!plant.sodaAshEnabled && results.optimization.cheapestMode === 'LimeOnly')
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex justify-between items-start mb-4">
                <h3 className={`font-bold text-sm flex items-center gap-2 ${
                  (plant.sodaAshEnabled && results.optimization.cheapestMode === 'LimeSoda') || (!plant.sodaAshEnabled && results.optimization.cheapestMode === 'LimeOnly')
                  ? 'text-emerald-800' : 'text-amber-800'
                }`}>
                  <i className="fa-solid fa-wand-magic-sparkles"></i>
                  Optimization Recommendation
                </h3>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-medium leading-relaxed">
                  The most cost-effective treatment mode is <strong>{results.optimization.cheapestMode === 'LimeOnly' ? 'LIME ONLY' : 'LIME + SODA ASH'}</strong>.
                </p>
                {((plant.sodaAshEnabled && results.optimization.cheapestMode === 'LimeOnly') || (!plant.sodaAshEnabled && results.optimization.cheapestMode === 'LimeSoda')) ? (
                  <div className="bg-white/50 p-3 rounded-lg border border-amber-200 flex flex-col gap-1">
                    <p className="text-[11px] text-amber-900">
                      Switching to {results.optimization.cheapestMode === 'LimeOnly' ? 'Lime Only' : 'Lime + Soda'} could save you roughly:
                    </p>
                    <p className="text-lg font-black text-amber-600">${results.optimization.potentialSavings.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} / day</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-700">
                    <i className="fa-solid fa-circle-check"></i>
                    <span className="text-[11px] font-bold uppercase tracking-wide">Currently using optimal mode</span>
                  </div>
                )}
                {!results.optimization.meetsTarget && (
                  <p className="text-[10px] text-red-600 font-bold bg-red-50 p-2 rounded border border-red-100">
                    <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                    Warning: Optimal cost mode may not meet hardness targets!
                  </p>
                )}
              </div>
            </div>

            <div className={`bg-gradient-to-br transition-all duration-700 ${plant.sodaAshEnabled ? 'from-blue-700 to-blue-900' : 'from-indigo-800 to-slate-900'} text-white rounded-2xl p-6 shadow-2xl relative overflow-hidden`}>
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2 relative z-10">
                <i className="fa-solid fa-vial-circle-check text-blue-300"></i> Softening Output
              </h3>
              <div className="grid grid-cols-2 gap-4 relative z-10">
                <div className="bg-white/10 p-4 rounded-xl backdrop-blur-md border border-white/20">
                  <p className="text-blue-200 text-[10px] font-bold mb-1 uppercase">Lime Dose</p>
                  <p className="text-3xl font-bold">{results.limeDose.toFixed(1)} <span className="text-sm font-normal text-blue-200">mg/L</span></p>
                  <p className="text-[9px] opacity-70 mt-1 uppercase">as Ca(OH)₂</p>
                </div>
                <div className={`bg-white/10 p-4 rounded-xl backdrop-blur-md border border-white/20 transition-all ${!plant.sodaAshEnabled ? 'opacity-30 grayscale' : 'opacity-100'}`}>
                  <p className="text-blue-200 text-[10px] font-bold mb-1 uppercase">Soda Ash</p>
                  <p className="text-3xl font-bold">{results.sodaAshDose.toFixed(1)} <span className="text-sm font-normal text-blue-200">mg/L</span></p>
                  <p className="text-[9px] opacity-70 mt-1 uppercase">as Na₂CO₃</p>
                </div>
                <div className="bg-white/10 p-4 rounded-xl backdrop-blur-md border border-white/20">
                  <p className="text-blue-200 text-[10px] font-bold mb-1 uppercase">Process pH</p>
                  <p className="text-3xl font-bold">{results.softeningPh.toFixed(1)}</p>
                  <p className="text-[9px] opacity-70 mt-1 uppercase font-semibold">{results.softeningPh >= 11 ? 'Mg Stage' : 'Ca Stage'}</p>
                </div>
                <div className="bg-white/10 p-4 rounded-xl backdrop-blur-md border border-white/20">
                  <p className="text-blue-200 text-[10px] font-bold mb-1 uppercase">Daily Cost</p>
                  <p className="text-3xl font-bold">${results.totalDailyCost.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</p>
                  <p className="text-[9px] opacity-70 mt-1 uppercase">USD per day</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h3 className="font-semibold text-slate-800 mb-6 flex items-center gap-2">
                <i className="fa-solid fa-box text-blue-600"></i> Daily Requirements
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-blue-50/50 rounded-xl border border-blue-100/50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm"><i className="fa-solid fa-scale-balanced"></i></div>
                    <div><p className="text-sm font-bold text-slate-700">Daily Lime</p><p className="text-[10px] text-slate-500 uppercase">Ca(OH)₂ Mass</p></div>
                  </div>
                  <p className="text-xl font-black text-slate-900">{results.totalLimeDaily.toLocaleString()} <span className="text-xs font-normal">kg/d</span></p>
                </div>
                <div className={`flex justify-between items-center p-4 bg-purple-50/50 rounded-xl border border-purple-100/50 ${!plant.sodaAshEnabled ? 'opacity-20 grayscale' : ''}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shadow-sm"><i className="fa-solid fa-cubes"></i></div>
                    <div><p className="text-sm font-bold text-slate-700">Daily Soda Ash</p><p className="text-[10px] text-slate-500 uppercase">Na₂CO₃ Mass</p></div>
                  </div>
                  <p className="text-xl font-black text-slate-900">{results.totalSodaDaily.toLocaleString()} <span className="text-xs font-normal">kg/d</span></p>
                </div>
                <div className="flex justify-between items-center p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shadow-sm"><i className="fa-solid fa-water-ladder"></i></div>
                    <div><p className="text-sm font-bold text-amber-800">Dry Sludge</p><p className="text-[10px] text-amber-600 font-bold uppercase">Total Solids</p></div>
                  </div>
                  <p className="text-xl font-black text-amber-900">{results.totalSludgeDaily.toLocaleString()} <span className="text-xs font-normal">kg/d</span></p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-semibold text-slate-800 mb-6 flex items-center gap-2">
                <i className="fa-solid fa-chart-column text-blue-600"></i> Performance Graph
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hardnessChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} />
                    <Legend />
                    <Bar dataKey="Calcium" name="Ca" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Magnesium" name="Mg" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-3 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest z-40">
        AquaSoft Pro | Engineering Assessment | SI Units: mg/L, μS/cm, ML/d, m/h
      </footer>

      {isHistoryOpen && (
        <div className="fixed inset-0 z-[60] overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsHistoryOpen(false)}></div>
          <div className="absolute inset-y-0 right-0 max-w-full flex">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-400">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-blue-50/30">
                <h2 className="text-xl font-bold flex items-center gap-2"><i className="fa-solid fa-clock-rotate-left text-blue-600"></i> Scenario History</h2>
                <button onClick={() => setIsHistoryOpen(false)} className="text-slate-400 hover:text-slate-600 transition p-2"><i className="fa-solid fa-xmark text-xl"></i></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {logs.length === 0 ? <p className="text-center text-slate-400 py-24">No saved scenarios.</p> : logs.map(log => (
                  <div key={log.id} onClick={() => loadLog(log)} className="group bg-slate-50 hover:bg-white hover:ring-2 hover:ring-blue-500 hover:shadow-xl rounded-2xl p-5 border border-slate-200 transition cursor-pointer relative">
                    <button onClick={(e) => deleteLog(log.id, e)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-2"><i className="fa-solid fa-trash-can"></i></button>
                    <div className="mb-4">
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{new Date(log.timestamp).toLocaleDateString()}</span>
                      <h4 className="font-bold text-slate-800 text-lg leading-tight mt-1">{log.label}</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-y-3 text-[11px] text-slate-500 font-medium">
                      <div className="flex items-center gap-2"><i className="fa-solid fa-droplet text-blue-400"></i> <span>{log.plant.dailyFlow} ML/d</span></div>
                      <div className="flex items-center gap-2"><i className="fa-solid fa-calculator text-emerald-400"></i> <span>{log.results.totalLimeDaily.toFixed(0)} kg/d lime</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
