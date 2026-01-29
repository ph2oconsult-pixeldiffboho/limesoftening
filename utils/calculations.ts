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
   * 1. Ca-CH: Removed at pH ~9.5-10.3 (Uses 1 mole Lime)
   * 2. Mg-CH: Removed at pH ~11.0+ (Uses 2 moles Lime)
   * 3. Mg-NCH: Removed at pH ~11.0+ (Uses 1 mole Lime + 1 mole Soda Ash)
   * 4. Ca-NCH: Removed at pH ~9.5+ (Uses 1 mole Soda Ash)
   */

  let alkRem = raw.alkalinity;

  // Step 1: Calcium Carbonate Hardness (Ca-CH)
  const caCHToRemove = Math.min(caToRemoveTarget, alkRem);
  alkRem -= caCHToRemove;

  // Step 2: Magnesium Carbonate Hardness (Mg-CH)
  const mgCHToRemove = Math.min(mgToRemoveTarget, alkRem);
  alkRem -= mgCHToRemove;

  // Step 3: Magnesium Non-Carbonate Hardness (Mg-NCH)
  const mgNCHToRemove = Math.max(0, mgToRemoveTarget - mgCHToRemove);

  // Step 4: Calcium Non-Carbonate Hardness (Ca-NCH)
  const caNCHToRemove = Math.max(0, caToRemoveTarget - caCHToRemove);

  /**
   * Softening Mode Constraints:
   * If Soda Ash is disabled, we cannot remove Non-Carbonate Hardness (NCH).
   * Removing Mg-NCH with lime alone simply replaces Mg hardness with Ca hardness.
   * To satisfy the user's requirement for Mg softening response:
   * We treat Mg softening (hardness reduction) as strictly dependent on Soda Ash for the NCH portion.
   */
  const actualMgNCHRemoved = plant.sodaAshEnabled ? mgNCHToRemove : 0;
  const actualCaNCHRemoved = plant.sodaAshEnabled ? caNCHToRemove : 0;

  // Final Achieved Hardness Reductions
  const finalCaRemoved = caCHToRemove + actualCaNCHRemoved;
  const finalMgRemoved = mgCHToRemove + actualMgNCHRemoved;

  // 2. Chemical Dosages (all conversions from CaCO₃ equivalents)
  // Lime Dose (as CaCO₃ eq): 1 per Ca-CH + 2 per Mg-CH + 1 per Mg-NCH
  const limeDoseAsCaCO3 = caCHToRemove + (2 * mgCHToRemove) + actualMgNCHRemoved;
  const limeDoseMgL = limeDoseAsCaCO3 * (MW_CaOH2 / MW_CaCO3);

  // Soda Ash Dose (as CaCO₃ eq): 1 per Mg-NCH + 1 per Ca-NCH
  const sodaAshDoseAsCaCO3 = actualMgNCHRemoved + actualCaNCHRemoved;
  const sodaAshDoseMgL = sodaAshDoseAsCaCO3 * (MW_Na2CO3 / MW_CaCO3);

  // Achieved Quality (mg/L as CaCO₃)
  const achievedCa = raw.calcium - finalCaRemoved;
  const achievedMg = raw.magnesium - finalMgRemoved;
  const achievedTotal = achievedCa + achievedMg;

  // Softening pH Estimation
  // Mg removal requires significant hydroxide excess (pH > 11.0)
  let softeningPh = 10.3;
  if (finalMgRemoved > 5) softeningPh = 10.8;
  if (finalMgRemoved > 15) softeningPh = 11.2;
  if (finalMgRemoved > 30) softeningPh = 11.4;

  // 3. Daily Mass Requirements (1 mg/L * 1 ML/d = 1 kg/d)
  const totalLimeDaily = limeDoseMgL * plant.dailyFlow; 
  const totalSodaDaily = sodaAshDoseMgL * plant.dailyFlow;

  // 4. Sludge Production (Dry Mass kg/d)
  // Sludge includes precipitated CaCO3 (from hardness and lime) and Mg(OH)2
  const sludgeCaCO3 = (finalCaRemoved + limeDoseAsCaCO3); 
  const sludgeMgOH2 = finalMgRemoved * MG_TO_CA_RATIO;
  const totalSludgeDaily = (sludgeCaCO3 + sludgeMgOH2) * plant.dailyFlow;

  // 5. Clarifier Design
  const flowPerHour = (plant.dailyFlow * 1000) / 24; // m³/h
  const flowPerUnit = flowPerHour / plant.clarifierCount;
  const solidsPerHour = totalSludgeDaily / 24; // kg/h
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
