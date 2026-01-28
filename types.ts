
export interface RawWaterData {
  ph: number;
  conductivity: number;
  calcium: number; // as CaCO3
  magnesium: number; // as CaCO3
  totalHardness: number; // as CaCO3
  alkalinity: number; // as CaCO3
}

export interface TargetWaterData {
  calcium: number;
  magnesium: number;
  totalHardness: number;
}

export interface PlantData {
  dailyFlow: number; // ML/d
  clarifierCount: number;
  hlr: number; // Hydraulic Loading Rate m/h
  solidsLoadingRate: number; // Solids Loading Rate kg/m2/h
}

export interface CalculationResults {
  limeDose: number; // mg/L as Ca(OH)2
  sodaAshDose: number; // mg/L as Na2CO3
  softeningPh: number;
  totalLimeDaily: number; // kg/day
  totalSodaDaily: number; // kg/day
  totalSludgeDaily: number; // kg/day (dry mass)
  clarifierArea: number; // m2 per unit
  clarifierDiameter: number; // m
  actualHLR: number; // m/h
  actualSolidsLoading: number; // kg/m2/h
  flowPerHour: number; // m3/h
  governingParameter: 'Hydraulic' | 'Solids';
}

export interface LogEntry {
  id: string;
  timestamp: string;
  label: string;
  raw: RawWaterData;
  target: TargetWaterData;
  plant: PlantData;
  results: CalculationResults;
}
