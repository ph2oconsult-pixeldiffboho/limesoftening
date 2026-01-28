
import { RawWaterData, TargetWaterData, PlantData, CalculationResults } from '../types';

export const calculateSoftening = (
  raw: RawWaterData,
  target: TargetWaterData,
  plant: PlantData
): CalculationResults => {
  // Constants
  const MW_CaOH2 = 74.1;
  const MW_CaCO3 = 100.1;
  const MW_Na2CO3 = 106.0;
  const MW_MgOH2 = 58.3;

  // 1. Identify Carbonate Hardness (CH) and Non-Carbonate Hardness (NCH)
  const CH = Math.min(raw.totalHardness, raw.alkalinity);
  const NCH = Math.max(0, raw.totalHardness - raw.alkalinity);

  // 2. Lime Dose (Ca(OH)2) Calculation
  const caToRemove = Math.max(0, raw.calcium - target.calcium);
  const mgToRemove = Math.max(0, raw.magnesium - target.magnesium);
  
  // Lime as CaCO3 eq
  const limeDoseAsCaCO3 = caToRemove + (mgToRemove * 2); 
  const limeDoseMgL = limeDoseAsCaCO3 * (MW_CaOH2 / MW_CaCO3);

  // 3. Soda Ash Dose Calculation
  const targetNCH = Math.max(0, target.totalHardness - Math.min(target.totalHardness, raw.alkalinity));
  const nchToRemove = Math.max(0, NCH - targetNCH);
  const sodaAshDoseMgL = nchToRemove * (MW_Na2CO3 / MW_CaCO3);

  // 4. Softening pH Estimation
  let softeningPh = 10.3;
  if (mgToRemove > 10) softeningPh = 11.0;
  if (mgToRemove > 30) softeningPh = 11.3;

  // 5. Daily Requirements
  const flowM3Day = plant.dailyFlow * 1000;
  const totalLimeDaily = (limeDoseMgL * flowM3Day) / 1000; // kg/day
  const totalSodaDaily = (sodaAshDoseMgL * flowM3Day) / 1000; // kg/day

  // 6. Sludge Production
  const sludgeCaCO3 = (caToRemove + limeDoseAsCaCO3) * 1.0; 
  const sludgeMgOH2 = mgToRemove * (MW_MgOH2 / MW_CaCO3);
  const totalSludgeMgL = sludgeCaCO3 + sludgeMgOH2;
  const totalSludgeDaily = (totalSludgeMgL * flowM3Day) / 1000; // kg/day

  // 7. Clarifier Design
  const flowPerHour = flowM3Day / 24;
  const flowPerUnit = flowPerHour / plant.clarifierCount;
  const solidsPerHour = totalSludgeDaily / 24;
  const solidsPerUnit = solidsPerHour / plant.clarifierCount;

  // Required Area based on Hydraulics (m/h)
  const areaHydraulic = plant.hlr > 0 ? flowPerUnit / plant.hlr : 0;
  
  // Required Area based on Solids Loading (kg/m2/h)
  const areaSolids = plant.solidsLoadingRate > 0 ? solidsPerUnit / plant.solidsLoadingRate : 0;

  // Final Design Area (Max of both)
  const clarifierArea = Math.max(areaHydraulic, areaSolids);
  const governingParameter: 'Hydraulic' | 'Solids' = areaHydraulic >= areaSolids ? 'Hydraulic' : 'Solids';
  
  const clarifierDiameter = clarifierArea > 0 ? Math.sqrt((4 * clarifierArea) / Math.PI) : 0;
  
  const actualHLR = clarifierArea > 0 ? flowPerUnit / clarifierArea : 0;
  const actualSolidsLoading = clarifierArea > 0 ? solidsPerUnit / clarifierArea : 0;

  return {
    limeDose: limeDoseMgL,
    sodaAshDose: sodaAshDoseMgL,
    softeningPh,
    totalLimeDaily,
    totalSodaDaily,
    totalSludgeDaily,
    clarifierArea,
    clarifierDiameter,
    actualHLR,
    actualSolidsLoading,
    flowPerHour,
    governingParameter
  };
};
