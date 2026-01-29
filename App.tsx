              </div>
import React, { useState, useEffect, useMemo } from 'react';
import { RawWaterData, TargetWaterData, PlantData, LogEntry } from './types';
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
  limeUnitCost: 0.25,
  sodaAshUnitCost: 0.60,
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
      const savedLogs = localStorage.getItem('aquasoft_v2_logs');
      if (savedLogs) {
        const parsed = JSON.parse(savedLogs);
        if (Array.isArray(parsed)) setLogs(parsed);
      }
    } catch (e) {
      console.error("Failed to load logs", e);
    }
  }, []);

  useEffect(() => {
    if (logs.length > 0) {
      localStorage.setItem('aquasoft_v2_logs', JSON.stringify(logs));
    }
  }, [logs]);

  const results = useMemo(() => calculateSoftening(raw, target, plant), [raw, target, plant]);

  const saveCurrentLog = () => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      label: logLabel || `Scenario ${new Date().toLocaleTimeString()}`,
      raw: { ...raw },
      target: { ...target },
      plant: { ...plant },
      results: { ...results }
    };
    setLogs(prev => [newLog, ...prev]);
    setLogLabel("");
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

  const hardnessChartData = [
    { name: 'Raw', Calcium: raw.calcium, Magnesium: raw.magnesium },
    { name: 'Target', Calcium: target.calcium, Magnesium: target.magnesium },
    { name: 'Achieved', Calcium: results.achieved.calcium, Magnesium: results.achieved.magnesium },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <nav className="bg-indigo-700 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <i className="fa-solid fa-water text-2xl"></i>
            <h1 className="text-xl font-bold tracking-tight">AquaSoft Pro <span className="font-light text-indigo-200 text-sm">v2.0</span></h1>
          </div>
          <div className="flex gap-3">
            <button onClick={handleRefresh} className="p-2 hover:bg-indigo-600 rounded-lg transition" title="Reset">
              <i className="fa-solid fa-rotate-right"></i>
            </button>
            <button onClick={() => setIsHistoryOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-800 hover:bg-indigo-900 rounded-lg transition text-sm font-medium border border-indigo-600">
              <i className="fa-solid fa-clock-rotate-left"></i> History
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-800">Lime Softening Assessment</h2>
            <p className="text-slate-500 mt-2 text-sm">Industrial water treatment stoichiometry and clarifier design.</p>
          </div>
          <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
            <input 
              type="text" 
              placeholder="Scenario name..." 
              value={logLabel} 
              onChange={(e) => setLogLabel(e.target.value)} 
              className="px-3 py-2 text-sm border-none focus:ring-0 outline-none w-48" 
            />
            <button 
              onClick={saveCurrentLog} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2"
            >
              <i className="fa-solid fa-floppy-disk"></i> Save
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-6">
            <InputSection title="Raw Water Quality" icon="fa-flask-vial">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">pH Units</label>
                <input type="number" step="0.1" value={raw.ph} onChange={e => handleRawChange('ph', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Calcium (mg/L CaCO₃)</label>
                <input type="number" value={raw.calcium} onChange={e => handleRawChange('calcium', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Magnesium (mg/L CaCO₃)</label>
                <input type="number" value={raw.magnesium} onChange={e => handleRawChange('magnesium', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Alkalinity (mg/L CaCO₃)</label>
                <input type="number" value={raw.alkalinity} onChange={e => handleRawChange('alkalinity', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </InputSection>

            <InputSection title="Target Hardness" icon="fa-bullseye">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Target Ca (mg/L)</label>
                <input type="number" value={target.calcium} onChange={e => handleTargetChange('calcium', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Target Mg (mg/L)</label>
                <input type="number" value={target.magnesium} onChange={e => handleTargetChange('magnesium', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </InputSection>

            <InputSection title="Plant Design & Costs" icon="fa-industry">
              <div className="col-span-full mb-4 bg-indigo-50 p-4 rounded-lg flex items-center justify-between">
                <span className="text-sm font-bold text-indigo-900">Enable Soda Ash (Na₂CO₃)</span>
                <button 
                  onClick={() => handlePlantChange('sodaAshEnabled', !plant.sodaAshEnabled)} 
                  className={`w-12 h-6 rounded-full transition-colors relative ${plant.sodaAshEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${plant.sodaAshEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Flow (ML/d)</label>
                <input type="number" value={plant.dailyFlow} onChange={e => handlePlantChange('dailyFlow', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">HLR (m/h)</label>
                <input type="number" step="0.1" value={plant.hlr} onChange={e => handlePlantChange('hlr', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Lime Cost ($/kg)</label>
                <input type="number" step="0.01" value={plant.limeUnitCost} onChange={e => handlePlantChange('limeUnitCost', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Soda Cost ($/kg)</label>
                <input type="number" step="0.01" value={plant.sodaAshUnitCost} onChange={e => handlePlantChange('sodaAshUnitCost', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </InputSection>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2 border-b border-white/10 pb-4">
                <i className="fa-solid fa-bolt text-yellow-400"></i> Softening Performance
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Lime Dose</p>
                  <p className="text-2xl font-bold">{results.limeDose.toFixed(1)} <span className="text-sm font-normal text-slate-400">mg/L</span></p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Soda Ash</p>
                  <p className={`text-2xl font-bold ${!plant.sodaAshEnabled ? 'opacity-30' : ''}`}>{results.sodaAshDose.toFixed(1)} <span className="text-sm font-normal text-slate-400">mg/L</span></p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Process pH</p>
                  <p className="text-2xl font-bold">{results.softeningPh.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Final TH</p>
                  <p className="text-2xl font-bold">{results.achieved.totalHardness.toFixed(0)} <span className="text-sm font-normal text-slate-400">mg/L</span></p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h3 className="font-semibold text-slate-800 mb-6 flex items-center gap-2">
                <i className="fa-solid fa-coins text-emerald-600"></i> Economic Assessment
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                  <span className="text-sm text-emerald-800 font-medium">Daily Chemical Cost</span>
                  <span className="text-lg font-bold text-emerald-900">${results.totalDailyCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-600">Daily Sludge Production</span>
                  <span className="text-lg font-bold text-slate-800">{results.totalSludgeDaily.toLocaleString(undefined, {maximumFractionDigits: 0})} kg/d</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-600">Clarifier Diameter</span>
                  <span className="text-lg font-bold text-slate-800">{results.clarifierDiameter.toFixed(1)} m</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-semibold text-slate-800 mb-6">Hardness Profile</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hardnessChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Calcium" stackId="a" fill="#6366f1" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Magnesium" stackId="a" fill="#818cf8" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </main>

      {isHistoryOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsHistoryOpen(false)}></div>
          <div className="w-full max-w-md bg-white h-full shadow-2xl relative flex flex-col">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">History</h2>
              <button onClick={() => setIsHistoryOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {logs.map(log => (
                <div key={log.id} onClick={() => loadLog(log)} className="p-4 bg-slate-50 rounded-lg border hover:border-indigo-500 cursor-pointer transition">
                  <p className="text-xs font-bold text-indigo-600 mb-1">{new Date(log.timestamp).toLocaleString()}</p>
                  <h4 className="font-bold text-slate-800">{log.label}</h4>
                </div>
              ))}
              {logs.length === 0 && <p className="text-center text-slate-400 py-10">No history available.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
