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

  // 1. Calculations are based on CaCO₃ equivalents (mg/L)
  // Theoretical removal targets based on raw vs desired quality
  const caToRemoveTarget = Math.max(0, raw.calcium - target.calcium);
  const mgToRemoveTarget = Math.max(0, raw.magnesium - target.magnesium);

  // Determine available alkalinity (Carbonate Hardness)
  let alkalinityRemaining = raw.alkalinity;

  // Segment targets into Carbonate Hardness (CH) and Non-Carbonate Hardness (NCH)
  // Magnesium removal stoichiometry (CH vs NCH)
  const mgCHToRemove = Math.min(mgToRemoveTarget, alkalinityRemaining);
  const mgNCHToRemove = Math.max(0, mgToRemoveTarget - mgCHToRemove);
  alkalinityRemaining -= mgCHToRemove;

  // Calcium removal stoichiometry (CH vs NCH)
  const caCHToRemove = Math.min(caToRemoveTarget, alkalinityRemaining);
  const caNCHToRemove = Math.max(0, caToRemoveTarget - caCHToRemove);
  alkalinityRemaining -= caCHToRemove;

  // 2. Apply Soda Ash Toggle
  // If Soda Ash is disabled, we do NOT remove NCH. 
  // We only perform "Carbonate Softening" using Lime.
  const actualMgNCHRemoved = plant.sodaAshEnabled ? mgNCHToRemove : 0;
  const actualCaNCHRemoved = plant.sodaAshEnabled ? caNCHToRemove : 0;

  // Effective removals achieved in this configuration
  const finalMgRemoved = mgCHToRemove + actualMgNCHRemoved;
  const finalCaRemoved = caCHToRemove + actualCaNCHRemoved;

  // 3. Chemical Dosages (as CaCO₃ eq)
  // Lime: 2 moles per Mg-CH, 1 mole per Mg-NCH (to precipitate as hydroxide), 1 mole per Ca-CH
  const limeDoseAsCaCO3 = (2 * mgCHToRemove) + (actualMgNCHRemoved) + (caCHToRemove);
  const limeDoseMgL = limeDoseAsCaCO3 * (MW_CaOH2 / MW_CaCO3);

  // Soda Ash: 1 mole per NCH unit (Mg-NCH + Ca-NCH)
  const sodaAshDoseAsCaCO3 = plant.sodaAshEnabled ? (mgNCHToRemove + caNCHToRemove) : 0;
  const sodaAshDoseMgL = sodaAshDoseAsCaCO3 * (MW_Na2CO3 / MW_CaCO3);

  // Achieved Quality
  const achievedCa = raw.calcium - finalCaRemoved;
  const achievedMg = raw.magnesium - finalMgRemoved;
  const achievedTotal = achievedCa + achievedMg;

  // Softening pH Estimation
  // Standard approximation: Mg removal requires pH 11+
  let softeningPh = 10.3;
  if (finalMgRemoved > 10) softeningPh = 11.0;
  if (finalMgRemoved > 30) softeningPh = 11.3;

  // 4. Daily Mass Requirements (1 mg/L * 1 ML = 1 kg)
  const totalLimeDaily = limeDoseMgL * plant.dailyFlow; // kg/d
  const totalSodaDaily = sodaAshDoseMgL * plant.dailyFlow; // kg/d

  // 5. Sludge Production (Dry Mass)
  // CaCO₃ produced from: (Raw Ca Removed) + (Ca added via Lime that precipitates with Alkalinity)
  const sludgeCaCO3 = (finalCaRemoved + limeDoseAsCaCO3); 
  // Mg(OH)₂ produced from Mg removal
  const sludgeMgOH2 = finalMgRemoved * MG_TO_CA_RATIO;
  
  const totalSludgeMgL = sludgeCaCO3 + sludgeMgOH2;
  const totalSludgeDaily = totalSludgeMgL * plant.dailyFlow; // kg/d

  // 6. Clarifier Design Calculations
  const flowPerHour = (plant.dailyFlow * 1000) / 24; // m³/h
  const flowPerUnit = flowPerHour / plant.clarifierCount;
  
  const solidsPerHour = totalSludgeDaily / 24; // kg/h
  const solidsPerUnit = solidsPerHour / plant.clarifierCount; // kg/h per unit

  // Area required for Hydraulics (m²) = Flow / HLR
  const areaHydraulic = plant.hlr > 0 ? flowPerUnit / plant.hlr : 0;
  
  // Area required for Solids (m²) = Solids / SLR
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
