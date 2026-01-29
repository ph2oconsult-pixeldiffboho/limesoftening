export interface RawWaterData {
  ph: number;
  conductivity: number;
  calcium: number; // as CaCO₃
  magnesium: number; // as CaCO₃
  totalHardness: number; // as CaCO₃
  alkalinity: number; // as CaCO₃
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
  solidsLoadingRate: number; // Solids Loading Rate kg/m²/h
  sodaAshEnabled: boolean;
  limeUnitCost: number; // $/kg
  sodaAshUnitCost: number; // $/kg
}

export interface AchievedWaterQuality {
  calcium: number;
  magnesium: number;
  totalHardness: number;
}

export interface CalculationResults {
  limeDose: number; // mg/L as Ca(OH)₂
  sodaAshDose: number; // mg/L as Na₂CO₃
  softeningPh: number;
  totalLimeDaily: number; // kg/d
  totalSodaDaily: number; // kg/d
  totalSludgeDaily: number; // kg/d (dry mass)
  dailyCostLime: number;
  dailyCostSoda: number;
  totalDailyCost: number;
  clarifierArea: number; // m² per unit
  clarifierDiameter: number; // m
  actualHLR: number; // m/h
  actualSolidsLoading: number; // kg/m²/h
  flowPerHour: number; // m³/h
  governingParameter: 'Hydraulic' | 'Solids';
  achieved: AchievedWaterQuality;
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
