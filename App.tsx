import React, { useState, useEffect, useMemo } from 'react';
import { RawWaterData, TargetWaterData, PlantData, CalculationResults, LogEntry } from './types';
import { calculateSoftening } from './utils/calculations';
import InputSection from './components/InputSection';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';

const App: React.FC = () => {
  // State for raw water
  const [raw, setRaw] = useState<RawWaterData>({
    ph: 7.8,
    conductivity: 450,
    calcium: 180,
    magnesium: 60,
    totalHardness: 240,
    alkalinity: 200,
  });

  // State for targets
  const [target, setTarget] = useState<TargetWaterData>({
    calcium: 80,
    magnesium: 20,
    totalHardness: 100,
  });

  // State for plant
  const [plant, setPlant] = useState<PlantData>({
    dailyFlow: 10,
    clarifierCount: 2,
    hlr: 1.5,
    solidsLoadingRate: 5.0,
    sodaAshEnabled: true,
  });

  // History State
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [logLabel, setLogLabel] = useState("");

  // Load logs on mount
  useEffect(() => {
    const savedLogs = localStorage.getItem('aquasoft_logs');
    if (savedLogs) {
      setLogs(JSON.parse(savedLogs));
    }
  }, []);

  // Sync logs to localStorage
  useEffect(() => {
    localStorage.setItem('aquasoft_logs', JSON.stringify(logs));
  }, [logs]);

  // Derived results
  const results = useMemo(() => calculateSoftening(raw, target, plant), [raw, target, plant]);

  const saveCurrentLog = () => {
    const newLog: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      label: logLabel || `Log ${new Date().toLocaleTimeString()}`,
      raw: { ...raw },
      target: { ...target },
      plant: { ...plant },
      results: { ...results }
    };
    setLogs([newLog, ...logs]);
    setLogLabel("");
    alert("Scenario saved to history!");
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

  // Chart Data
  const hardnessChartData = [
    { name: 'Raw Water', Calcium: raw.calcium, Magnesium: raw.magnesium },
    { name: 'Target', Calcium: target.calcium, Magnesium: target.magnesium },
    { name: 'Achieved', Calcium: results.achieved.calcium, Magnesium: results.achieved.magnesium },
  ];

  const chemicalData = [
    { name: 'Lime (kg/d)', value: results.totalLimeDaily },
    { name: 'Soda Ash (kg/d)', value: results.totalSodaDaily },
  ].filter(d => d.value > 0);

  const COLORS = ['#2563eb', '#9333ea', '#10b981', '#f59e0b'];

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

  const targetsMet = results.achieved.totalHardness <= target.totalHardness + 1;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Navbar */}
      <nav className="bg-blue-700 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-droplet text-2xl"></i>
            <h1 className="text-xl font-bold tracking-tight">AquaSoft Pro <span className="font-light text-blue-200">v1.0</span></h1>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => setIsHistoryOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-800 hover:bg-blue-900 rounded-lg transition text-sm font-medium border border-blue-600"
            >
              <i className="fa-solid fa-clock-rotate-left"></i>
              History ({logs.length})
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-800">Lime Softening Assessment</h2>
            <p className="text-slate-500 mt-2">Enter your water parameters and plant capacity to calculate chemical dosages and clarifier dimensions.</p>
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
              <i className="fa-solid fa-floppy-disk"></i>
              Save Log
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT: INPUTS */}
          <div className="lg:col-span-7 space-y-6">
            
            <InputSection title="Raw Water Quality" icon="fa-flask-vial">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">pH</label>
                <input type="number" step="0.1" value={raw.ph} onChange={e => handleRawChange('ph', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 tracking-wider">Conductivity (μS/cm)</label>
                <input type="number" value={raw.conductivity} onChange={e => handleRawChange('conductivity', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Ca (mg/L as CaCO₃)</label>
                <input type="number" value={raw.calcium} onChange={e => handleRawChange('calcium', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Mg (mg/L as CaCO₃)</label>
                <input type="number" value={raw.magnesium} onChange={e => handleRawChange('magnesium', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 tracking-wider">Alkalinity (mg/L as CaCO₃)</label>
                <input type="number" value={raw.alkalinity} onChange={e => handleRawChange('alkalinity', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 tracking-wider">Total Hardness (mg/L as CaCO₃)</label>
                <input type="number" value={raw.totalHardness} onChange={e => handleRawChange('totalHardness', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </InputSection>

            <InputSection title="Target Water Quality" icon="fa-bullseye">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Target Ca (mg/L as CaCO₃)</label>
                <input type="number" value={target.calcium} onChange={e => handleTargetChange('calcium', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Target Mg (mg/L as CaCO₃)</label>
                <input type="number" value={target.magnesium} onChange={e => handleTargetChange('magnesium', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Target Total Hardness (mg/L as CaCO₃)</label>
                <input type="number" value={target.totalHardness} onChange={e => handleTargetChange('totalHardness', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </InputSection>

            <InputSection title="Plant Configuration" icon="fa-industry">
              <div className="flex flex-col justify-center">
                <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-widest">Dosing Comparison</label>
                <div className="flex items-center gap-3 bg-slate-100 p-2 rounded-lg">
                  <span className={`text-xs font-bold ${!plant.sodaAshEnabled ? 'text-blue-600' : 'text-slate-400'}`}>Lime Only</span>
                  <button 
                    onClick={() => handlePlantChange('sodaAshEnabled', !plant.sodaAshEnabled)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${plant.sodaAshEnabled ? 'bg-blue-600' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${plant.sodaAshEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </button>
                  <span className={`text-xs font-bold ${plant.sodaAshEnabled ? 'text-blue-600' : 'text-slate-400'}`}>Lime + Soda</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 tracking-wider">Daily Flow (ML/d)</label>
                <input type="number" value={plant.dailyFlow} onChange={e => handlePlantChange('dailyFlow', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 tracking-wider">No. of Units</label>
                <input type="number" value={plant.clarifierCount} onChange={e => handlePlantChange('clarifierCount', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 tracking-wider">Design HLR (m/h)</label>
                <input type="number" step="0.1" value={plant.hlr} onChange={e => handlePlantChange('hlr', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 tracking-wider">Design Solids Load (kg/m²/h)</label>
                <input type="number" step="0.1" value={plant.solidsLoadingRate} onChange={e => handlePlantChange('solidsLoadingRate', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </InputSection>

            {/* Hardness Comparison Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <i className="fa-solid fa-chart-column text-blue-600"></i>
                  Hardness Comparison <span className="text-sm font-normal text-slate-500">(mg/L as CaCO₃)</span>
                </h3>
                {!targetsMet && (
                  <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100 animate-pulse">
                    <i className="fa-solid fa-triangle-exclamation text-xs"></i>
                    <span className="text-[10px] font-bold uppercase tracking-widest">Targets Not Fully Met</span>
                  </div>
                )}
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hardnessChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend />
                    <Bar dataKey="Calcium" name="Calcium (as Ca)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Magnesium" name="Magnesium (as Mg)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* RIGHT: RESULTS */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Chemical Dose Stats */}
            <div className={`bg-gradient-to-br transition-colors duration-500 ${plant.sodaAshEnabled ? 'from-blue-600 to-blue-800' : 'from-indigo-600 to-indigo-800'} text-white rounded-xl p-6 shadow-xl`}>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <i className="fa-solid fa-calculator"></i>
                Required Chemical Doses
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm border border-white/10">
                  <p className="text-blue-100 text-xs font-medium mb-1">Lime Dose Ca(OH)₂</p>
                  <p className="text-2xl font-bold">{results.limeDose.toFixed(1)} <span className="text-sm font-normal">mg/L</span></p>
                </div>
                <div className={`bg-white/10 p-4 rounded-lg backdrop-blur-sm border border-white/10 transition-opacity ${!plant.sodaAshEnabled ? 'opacity-30' : 'opacity-100'}`}>
                  <p className="text-blue-100 text-xs font-medium mb-1">Soda Ash Dose Na₂CO₃</p>
                  <p className="text-2xl font-bold">{results.sodaAshDose.toFixed(1)} <span className="text-sm font-normal">mg/L</span></p>
                </div>
                <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm border border-white/10">
                  <p className="text-blue-100 text-xs font-medium mb-1">Softening pH</p>
                  <p className="text-2xl font-bold">{results.softeningPh.toFixed(1)}</p>
                </div>
                <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm border border-white/10">
                  <p className="text-blue-100 text-xs font-medium mb-1 tracking-wider">Achieved Total Hardness</p>
                  <p className={`text-2xl font-bold ${!targetsMet ? 'text-amber-200' : 'text-white'}`}>{results.achieved.totalHardness.toFixed(0)} <span className="text-sm font-normal">mg/L</span></p>
                </div>
              </div>
            </div>

            {/* Daily Totals */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h3 className="font-semibold text-slate-800 mb-4">Daily Resource Requirements</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <i className="fa-solid fa-weight-hanging"></i>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Daily Lime</p>
                      <p className="text-xs text-slate-500">Commercial Ca(OH)₂</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-slate-800">{results.totalLimeDaily.toLocaleString()} kg/d</p>
                </div>

                <div className={`flex justify-between items-center p-3 bg-slate-50 rounded-lg transition-opacity ${!plant.sodaAshEnabled ? 'opacity-30' : 'opacity-100'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                      <i className="fa-solid fa-box"></i>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Daily Soda Ash</p>
                      <p className="text-xs text-slate-500">Na₂CO₃ powder</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-slate-800">{results.totalSodaDaily.toLocaleString()} kg/d</p>
                </div>

                <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                      <i className="fa-solid fa-vial"></i>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Dry Sludge Mass</p>
                      <p className="text-xs text-slate-500">CaCO₃ + Mg(OH)₂</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-amber-700">{results.totalSludgeDaily.toLocaleString()} kg/d</p>
                </div>
              </div>
            </div>

            {/* Clarifier Design */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <i className="fa-solid fa-compass-drafting text-blue-600"></i>
                  Clarifier Design Info
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${results.governingParameter === 'Hydraulic' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                  Governed by {results.governingParameter}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-slate-500 text-[10px] font-bold mb-1 tracking-wider uppercase">Unit Diameter</p>
                  <p className="text-3xl font-bold text-blue-600">{results.clarifierDiameter.toFixed(1)} <span className="text-base font-normal">m</span></p>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-slate-500 text-[10px] font-bold mb-1 tracking-wider uppercase">Area Per Unit</p>
                  <p className="text-3xl font-bold text-blue-600">{results.clarifierArea.toFixed(1)} <span className="text-base font-normal">m²</span></p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm py-2 border-b border-slate-100">
                  <span className="text-slate-500 text-[10px] font-bold tracking-tight uppercase">Actual HLR (Hydraulic)</span>
                  <span className="font-semibold">{results.actualHLR.toFixed(2)} m/h</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b border-slate-100">
                  <span className="text-slate-500 text-[10px] font-bold tracking-tight uppercase">Actual Solids Load</span>
                  <span className="font-semibold">{results.actualSolidsLoading.toFixed(2)} kg/m²/h</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b border-slate-100">
                  <span className="text-slate-500 text-[10px] font-bold tracking-tight uppercase">Total Units</span>
                  <span className="font-semibold">{plant.clarifierCount} units</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b border-slate-100">
                  <span className="text-slate-500 text-[10px] font-bold tracking-tight uppercase">Flow Per Unit</span>
                  <span className="font-semibold">{(results.flowPerHour / plant.clarifierCount).toFixed(1)} m³/h</span>
                </div>
              </div>
            </div>

            {/* Visual breakdown of sludge */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
               <h3 className="font-semibold text-slate-800 mb-4 text-[10px] tracking-widest uppercase">Chemical Mass Distribution</h3>
               <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chemicalData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chemicalData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
               </div>
            </div>

          </div>
        </div>
      </main>

      {/* History Slide-over */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-[60] overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsHistoryOpen(false)}></div>
          <div className="absolute inset-y-0 right-0 max-w-full flex">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <i className="fa-solid fa-history text-blue-600"></i>
                  Historical Logs
                </h2>
                <button onClick={() => setIsHistoryOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                  <i className="fa-solid fa-xmark text-xl"></i>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {logs.length === 0 ? (
                  <div className="text-center py-20 opacity-40">
                    <i className="fa-solid fa-folder-open text-4xl mb-4"></i>
                    <p>No saved scenarios yet.</p>
                  </div>
                ) : (
                  logs.map(log => (
                    <div 
                      key={log.id} 
                      onClick={() => loadLog(log)}
                      className="group bg-slate-50 hover:bg-white hover:ring-2 hover:ring-blue-500 hover:shadow-lg rounded-xl p-4 border border-slate-200 transition cursor-pointer relative"
                    >
                      <button 
                        onClick={(e) => deleteLog(log.id, e)}
                        className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-2"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                      <div className="mb-2">
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{new Date(log.timestamp).toLocaleDateString()}</span>
                        <h4 className="font-bold text-slate-800 text-lg">{log.label}</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500">
                        <p>Flow: <span className="font-medium text-slate-700">{log.plant.dailyFlow} ML/d</span></p>
                        <p>Total Hardness: <span className="font-medium text-slate-700">{log.raw.totalHardness} mg/L</span></p>
                        <p>Lime Dose: <span className="font-medium text-slate-700">{log.results.limeDose.toFixed(1)} mg/L</span></p>
                        <p>Sludge: <span className="font-medium text-slate-700">{log.results.totalSludgeDaily.toFixed(0)} kg/d</span></p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-400">
        AquaSoft Pro | Engineering Softening Calculation Tool | All units in SI
      </footer>
    </div>
  );
};

export default App;
