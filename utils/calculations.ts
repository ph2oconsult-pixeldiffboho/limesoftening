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
  const caToRemoveTarget = Math.max(0, raw.calcium - target.calcium);
  const mgToRemoveTarget = Math.max(0, raw.magnesium - target.magnesium);

  // Determine available alkalinity (Carbonate Hardness)
  let alkalinityRemaining = raw.alkalinity;

  // Magnesium removal stoichiometry (CH vs NCH)
  const mgCHToRemove = Math.min(mgToRemoveTarget, alkalinityRemaining);
  const mgNCHToRemove = Math.max(0, mgToRemoveTarget - mgCHToRemove);
  alkalinityRemaining -= mgCHToRemove;

  // Calcium removal stoichiometry (CH vs NCH)
  const caCHToRemove = Math.min(caToRemoveTarget, alkalinityRemaining);
  const caNCHToRemove = Math.max(0, caToRemoveTarget - caCHToRemove);
  alkalinityRemaining -= caCHToRemove;

  // Actual removals based on Soda Ash toggle
  const actualMgNCHRemoved = plant.sodaAshEnabled ? mgNCHToRemove : 0;
  const actualCaNCHRemoved = plant.sodaAshEnabled ? caNCHToRemove : 0;

  // Effective removals achieved
  const finalMgRemoved = mgCHToRemove + actualMgNCHRemoved;
  const finalCaRemoved = caCHToRemove + actualCaNCHRemoved;

  // Lime Dose (as CaCO₃ eq)
  // 2 moles Lime per mole Mg-CH, 1 mole Lime per mole Mg-NCH, 1 mole Lime per mole Ca-CH
  const limeDoseAsCaCO3 = (2 * mgCHToRemove) + (1 * mgNCHToRemove) + (1 * caCHToRemove);
  const limeDoseMgL = limeDoseAsCaCO3 * (MW_CaOH2 / MW_CaCO3);

  // Soda Ash Dose (as CaCO₃ eq)
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

  // Daily Mass Requirements (Conversion: 1 mg/L * 1 ML = 1 kg)
  const totalLimeDaily = limeDoseMgL * plant.dailyFlow; // kg/d
  const totalSodaDaily = sodaAshDoseMgL * plant.dailyFlow; // kg/d

  // Sludge Production (Dry Mass)
  // CaCO₃ produced from raw Ca removal + CaCO₃ produced from Lime addition
  const sludgeCaCO3 = (finalCaRemoved + limeDoseAsCaCO3); 
  // Mg(OH)₂ produced from Mg removal
  const sludgeMgOH2 = finalMgRemoved * MG_TO_CA_RATIO;
  
  const totalSludgeMgL = sludgeCaCO3 + sludgeMgOH2;
  const totalSludgeDaily = totalSludgeMgL * plant.dailyFlow; // kg/d

  // Clarifier Design Calculations
  const flowPerHour = (plant.dailyFlow * 1000) / 24; // m³/h
  const flowPerUnit = flowPerHour / plant.clarifierCount;
  
  const solidsPerHour = totalSludgeDaily / 24; // kg/h
  const solidsPerUnit = solidsPerHour / plant.clarifierCount; // kg/h per unit

  // 1. Area required for Hydraulics (m²) = Flow (m³/h) / HLR (m/h)
  const areaHydraulic = plant.hlr > 0 ? flowPerUnit / plant.hlr : 0;
  
  // 2. Area required for Solids (m²) = Solids (kg/h) / SLR (kg/m²/h)
  const areaSolids = plant.solidsLoadingRate > 0 ? solidsPerUnit / plant.solidsLoadingRate : 0;

  // Design Area is the maximum of the two requirements
  const clarifierArea = Math.max(areaHydraulic, areaSolids);
  const governingParameter: 'Hydraulic' | 'Solids' = areaHydraulic >= areaSolids ? 'Hydraulic' : 'Solids';
  
  const clarifierDiameter = clarifierArea > 0 ? Math.sqrt((4 * clarifierArea) / Math.PI) : 0;
  
  // Actual loadings based on final chosen area
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
