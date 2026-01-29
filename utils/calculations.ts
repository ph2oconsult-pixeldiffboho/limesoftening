import { RawWaterData, TargetWaterData, PlantData, CalculationResults } from '../types';

export const calculateSoftening = (
  raw: RawWaterData,
  target: TargetWaterData,
  plant: PlantData
): CalculationResults => {
  // Molecular Weights / Conversion Factors
  const MW_CaOH2 = 74.1;
  const MW_CaCO3 = 100.1;
  const MW_Na2CO3 = 106.0;
  const MW_MgOH2 = 58.3;
  const MG_TO_CA_RATIO = MW_MgOH2 / MW_CaCO3; // ~0.583

  // 1. Determine theoretical removal requirements (mg/L as CaCO₃)
  const caToRemoveTarget = Math.max(0, raw.calcium - target.calcium);
  const mgToRemoveTarget = Math.max(0, raw.magnesium - target.magnesium);

  /**
   * STOICHIOMETRIC PRIORITY (Standard Engineering Practice):
   * 1. Ca-CH: Removed at pH ~9.5-10.3 (Uses 1 Lime)
   * 2. Mg-CH: Removed at pH ~11.0+ (Uses 2 Lime)
   * 3. Mg-NCH: Removed at pH ~11.0+ (Uses 1 Lime + 1 Soda Ash)
   * 4. Ca-NCH: (Uses 1 Soda Ash)
   */

  let alkRem = raw.alkalinity;

  // 1. Ca Carbonate Hardness (Ca-CH)
  const caCHToRemove = Math.min(caToRemoveTarget, alkRem);
  alkRem -= caCHToRemove;

  // 2. Mg Carbonate Hardness (Mg-CH)
  const mgCHToRemove = Math.min(mgToRemoveTarget, alkRem);
  alkRem -= mgCHToRemove;

  // 3. Mg Non-Carbonate Hardness (Mg-NCH)
  const mgNCHToRemove = Math.max(0, mgToRemoveTarget - mgCHToRemove);

  // 4. Ca Non-Carbonate Hardness (Ca-NCH)
  const caNCHToRemove = Math.max(0, caToRemoveTarget - caCHToRemove);

  // Apply Soda Ash Constraint
  // If Soda Ash is disabled, we cannot remove Non-Carbonate Hardness.
  const actualMgNCHRemoved = plant.sodaAshEnabled ? mgNCHToRemove : 0;
  const actualCaNCHRemoved = plant.sodaAshEnabled ? caNCHToRemove : 0;

  // Final Achieved Removals
  const finalCaRemoved = caCHToRemove + actualCaNCHRemoved;
  const finalMgRemoved = mgCHToRemove + actualMgNCHRemoved;

  // 2. Chemical Dosages (as CaCO₃ eq)
  // Lime Dose: 1 for Ca-CH, 2 for Mg-CH, 1 for Mg-NCH
  const limeDoseAsCaCO3 = (1 * caCHToRemove) + (2 * mgCHToRemove) + (1 * actualMgNCHRemoved);
  const limeDoseMgL = limeDoseAsCaCO3 * (MW_CaOH2 / MW_CaCO3);

  // Soda Ash Dose: 1 for Mg-NCH, 1 for Ca-NCH
  const sodaAshDoseAsCaCO3 = plant.sodaAshEnabled ? (mgNCHToRemove + caNCHToRemove) : 0;
  const sodaAshDoseMgL = sodaAshDoseAsCaCO3 * (MW_Na2CO3 / MW_CaCO3);

  // Achieved Quality
  const achievedCa = raw.calcium - finalCaRemoved;
  const achievedMg = raw.magnesium - finalMgRemoved;
  const achievedTotal = achievedCa + achievedMg;

  // Softening pH Estimation
  let softeningPh = 10.3;
  if (finalMgRemoved > 10) softeningPh = 11.0;
  if (finalMgRemoved > 30) softeningPh = 11.3;

  // 3. Daily Mass Requirements
  const totalLimeDaily = limeDoseMgL * plant.dailyFlow; // kg/d
  const totalSodaDaily = sodaAshDoseMgL * plant.dailyFlow; // kg/d

  // 4. Sludge Production (Dry Mass)
  // CaCO3 from raw Ca removal + CaCO3 from Lime reaction + Mg(OH)2 from Mg removal
  const sludgeCaCO3 = (finalCaRemoved + limeDoseAsCaCO3); 
  const sludgeMgOH2 = finalMgRemoved * MG_TO_CA_RATIO;
  const totalSludgeDaily = (sludgeCaCO3 + sludgeMgOH2) * plant.dailyFlow; // kg/d

  // 5. Clarifier Design
  const flowPerHour = (plant.dailyFlow * 1000) / 24;
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
