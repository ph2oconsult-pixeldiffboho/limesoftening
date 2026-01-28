
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

  // 1. Calculations are based on CaCO₃ equivalents (mg/L)
  // Hardness to remove
  const caToRemove = Math.max(0, raw.calcium - target.calcium);
  const mgToRemove = Math.max(0, raw.magnesium - target.magnesium);

  /**
   * STOICHIOMETRIC RULES FOR LIME & SODA ASH:
   * 1. Ca Carbonate Hardness (Ca-CH): 1 mole Lime per mole Ca
   * 2. Mg Carbonate Hardness (Mg-CH): 2 moles Lime per mole Mg
   * 3. Mg Non-Carbonate Hardness (Mg-NCH): 1 mole Lime + 1 mole Soda Ash per mole Mg
   * 4. Ca Non-Carbonate Hardness (Ca-NCH): 1 mole Soda Ash per mole Ca
   * 
   * Maximizing Lime: Use Lime for all Mg removal and all available Alkalinity for Ca removal.
   */

  // Determine available alkalinity (CH)
  let alkalinityRemaining = raw.alkalinity;

  // Magnesium removal stoichiometry
  // Mg-CH removal consumes alkalinity.
  const mgCHToRemove = Math.min(mgToRemove, alkalinityRemaining);
  const mgNCHToRemove = Math.max(0, mgToRemove - mgCHToRemove);
  alkalinityRemaining -= mgCHToRemove;

  // Calcium removal stoichiometry
  // Ca-CH removal consumes alkalinity.
  const caCHToRemove = Math.min(caToRemove, alkalinityRemaining);
  const caNCHToRemove = Math.max(0, caToRemove - caCHToRemove);
  alkalinityRemaining -= caCHToRemove;

  // Lime Dose (as CaCO₃ eq)
  // 2 * Mg-CH + 1 * Mg-NCH + 1 * Ca-CH
  const limeDoseAsCaCO3 = (2 * mgCHToRemove) + (1 * mgNCHToRemove) + (1 * caCHToRemove);
  const limeDoseMgL = limeDoseAsCaCO3 * (MW_CaOH2 / MW_CaCO3);

  // Soda Ash Dose (as CaCO₃ eq)
  // 1 * Mg-NCH + 1 * Ca-NCH
  const sodaAshDoseAsCaCO3 = mgNCHToRemove + caNCHToRemove;
  const sodaAshDoseMgL = sodaAshDoseAsCaCO3 * (MW_Na2CO3 / MW_CaCO3);

  // 4. Softening pH Estimation
  // Mg removal requires high pH (11+)
  let softeningPh = 10.3;
  if (mgToRemove > 10) softeningPh = 11.0;
  if (mgToRemove > 30) softeningPh = 11.3;

  // 5. Daily Requirements
  const flowM3Day = plant.dailyFlow * 1000;
  const totalLimeDaily = (limeDoseMgL * flowM3Day) / 1000; // kg/d
  const totalSodaDaily = (sodaAshDoseMgL * flowM3Day) / 1000; // kg/d

  // 6. Sludge Production (Dry Mass)
  // CaCO₃ produced from Ca removal + CaCO₃ produced from Lime reaction
  const sludgeCaCO3 = (caToRemove + limeDoseAsCaCO3) * 1.0; 
  const sludgeMgOH2 = mgToRemove * (MW_MgOH2 / MW_CaCO3);
  const totalSludgeMgL = sludgeCaCO3 + sludgeMgOH2;
  const totalSludgeDaily = (totalSludgeMgL * flowM3Day) / 1000; // kg/d

  // 7. Clarifier Design
  const flowPerHour = flowM3Day / 24;
  const flowPerUnit = flowPerHour / plant.clarifierCount;
  const solidsPerHour = totalSludgeDaily / 24;
  const solidsPerUnit = solidsPerHour / plant.clarifierCount;

  // Required Area based on Hydraulics (m/h)
  const areaHydraulic = plant.hlr > 0 ? flowPerUnit / plant.hlr : 0;
  
  // Required Area based on Solids Loading (kg/m²/h)
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
