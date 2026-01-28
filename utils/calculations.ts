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
  // Hardness to remove (theoretical based on targets)
  const caToRemoveTarget = Math.max(0, raw.calcium - target.calcium);
  const mgToRemoveTarget = Math.max(0, raw.magnesium - target.magnesium);

  /**
   * STOICHIOMETRIC RULES FOR LIME & SODA ASH:
   * 1. Ca Carbonate Hardness (Ca-CH): 1 mole Lime per mole Ca
   * 2. Mg Carbonate Hardness (Mg-CH): 2 moles Lime per mole Mg
   * 3. Mg Non-Carbonate Hardness (Mg-NCH): 1 mole Lime + 1 mole Soda Ash per mole Mg
   * 4. Ca Non-Carbonate Hardness (Ca-NCH): 1 mole Soda Ash per mole Ca
   */

  // Determine available alkalinity (CH)
  let alkalinityRemaining = raw.alkalinity;

  // Magnesium removal stoichiometry
  const mgCHToRemove = Math.min(mgToRemoveTarget, alkalinityRemaining);
  const mgNCHToRemove = Math.max(0, mgToRemoveTarget - mgCHToRemove);
  alkalinityRemaining -= mgCHToRemove;

  // Calcium removal stoichiometry
  const caCHToRemove = Math.min(caToRemoveTarget, alkalinityRemaining);
  const caNCHToRemove = Math.max(0, caToRemoveTarget - caCHToRemove);
  alkalinityRemaining -= caCHToRemove;

  // Actual removals if Soda Ash is disabled
  const actualMgNCHRemoved = plant.sodaAshEnabled ? mgNCHToRemove : 0;
  const actualCaNCHRemoved = plant.sodaAshEnabled ? caNCHToRemove : 0;

  // Effective removals
  const finalMgRemoved = mgCHToRemove + actualMgNCHRemoved;
  const finalCaRemoved = caCHToRemove + actualCaNCHRemoved;

  // Lime Dose (as CaCO₃ eq)
  // Note: Even if soda ash is off, lime is still needed to convert Mg-NCH to Mg(OH)2 
  // but the Ca released (as Ca-NCH) stays in the water unless Soda Ash is added.
  const limeDoseAsCaCO3 = (2 * mgCHToRemove) + (1 * mgNCHToRemove) + (1 * caCHToRemove);
  const limeDoseMgL = limeDoseAsCaCO3 * (MW_CaOH2 / MW_CaCO3);

  // Soda Ash Dose (as CaCO₃ eq)
  const sodaAshDoseAsCaCO3 = plant.sodaAshEnabled ? (mgNCHToRemove + caNCHToRemove) : 0;
  const sodaAshDoseMgL = sodaAshDoseAsCaCO3 * (MW_Na2CO3 / MW_CaCO3);

  // Achieved Quality
  const achievedCa = raw.calcium - finalCaRemoved;
  const achievedMg = raw.magnesium - finalMgRemoved;
  const achievedTotal = achievedCa + achievedMg;

  // 4. Softening pH Estimation
  let softeningPh = 10.3;
  if (finalMgRemoved > 10) softeningPh = 11.0;
  if (finalMgRemoved > 30) softeningPh = 11.3;

  // 5. Daily Requirements
  const flowM3Day = plant.dailyFlow * 1000;
  const totalLimeDaily = (limeDoseMgL * flowM3Day) / 1000; // kg/d
  const totalSodaDaily = (sodaAshDoseMgL * flowM3Day) / 1000; // kg/d

  // 6. Sludge Production (Dry Mass)
  // CaCO₃ produced from Ca removal + CaCO₃ produced from Lime reaction
  const sludgeCaCO3 = (finalCaRemoved + limeDoseAsCaCO3) * 1.0; 
  const sludgeMgOH2 = finalMgRemoved * (MW_MgOH2 / MW_CaCO3);
  const totalSludgeMgL = sludgeCaCO3 + sludgeMgOH2;
  const totalSludgeDaily = (totalSludgeMgL * flowM3Day) / 1000; // kg/d

  // 7. Clarifier Design
  const flowPerHour = flowM3Day / 24;
  const flowPerUnit = flowPerHour / plant.clarifierCount;
  const solidsPerHour = totalSludgeDaily / 24;
  const solidsPerUnit = solidsPerHour / plant.clarifierCount;

  const areaHydraulic = plant.hlr > 0 ? flowPerUnit / plant.hlr : 0;
  const areaSolids = plant.solidsLoadingRate > 0 ? solidsPerUnit / plant.solidsLoadingRate : 0;

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
    governingParameter,
    achieved: {
      calcium: achievedCa,
      magnesium: achievedMg,
      totalHardness: achievedTotal
    }
  };
};
