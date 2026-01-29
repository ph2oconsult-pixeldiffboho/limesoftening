import { RawWaterData, TargetWaterData, PlantData, CalculationResults } from '../types';

export const calculateSoftening = (
  raw: RawWaterData,
  target: TargetWaterData,
  plant: PlantData
): CalculationResults => {
  const MW_CaOH2 = 74.1;
  const MW_CaCO3 = 100.1;
  const MW_Na2CO3 = 106.0;
  const MW_MgOH2 = 58.3;
  const MG_TO_CA_RATIO = MW_MgOH2 / MW_CaCO3;

  const caToRemoveTarget = Math.max(0, (raw.calcium || 0) - (target.calcium || 0));
  const mgToRemoveTarget = Math.max(0, (raw.magnesium || 0) - (target.magnesium || 0));

  let alkRem = raw.alkalinity || 0;

  // Stoichiometry: 
  // 1. Carbonate Hardness (CH) Removal
  const caCHToRemove = Math.min(caToRemoveTarget, alkRem);
  alkRem -= caCHToRemove;

  const mgCHToRemove = Math.min(mgToRemoveTarget, alkRem);
  alkRem -= mgCHToRemove;

  // 2. Non-Carbonate Hardness (NCH) Removal (Requires Soda Ash)
  const mgNCHToRemove = Math.max(0, mgToRemoveTarget - mgCHToRemove);
  const caNCHToRemove = Math.max(0, caToRemoveTarget - caCHToRemove);

  const actualMgNCHRemoved = plant.sodaAshEnabled ? mgNCHToRemove : 0;
  const actualCaNCHRemoved = plant.sodaAshEnabled ? caNCHToRemove : 0;

  const finalCaRemoved = caCHToRemove + actualCaNCHRemoved;
  const finalMgRemoved = mgCHToRemove + actualMgNCHRemoved;

  // Lime dose as CaCO3 = CaCH + 2*MgCH + MgNCH
  const limeDoseAsCaCO3 = caCHToRemove + (2 * mgCHToRemove) + actualMgNCHRemoved;
  const limeDoseMgL = limeDoseAsCaCO3 * (MW_CaOH2 / MW_CaCO3);

  // Soda ash dose as CaCO3 = MgNCH + CaNCH
  const sodaAshDoseAsCaCO3 = actualMgNCHRemoved + actualCaNCHRemoved;
  const sodaAshDoseMgL = sodaAshDoseAsCaCO3 * (MW_Na2CO3 / MW_CaCO3);

  const achievedCa = (raw.calcium || 0) - finalCaRemoved;
  const achievedMg = (raw.magnesium || 0) - finalMgRemoved;

  // Softening pH Estimation
  let softeningPh = 10.3;
  if (finalMgRemoved > 5) softeningPh = 10.8;
  if (finalMgRemoved > 15) softeningPh = 11.2;
  if (finalMgRemoved > 30) softeningPh = 11.4;

  // Mass Balance
  const totalLimeDaily = limeDoseMgL * (plant.dailyFlow || 0); 
  const totalSodaDaily = sodaAshDoseMgL * (plant.dailyFlow || 0);

  // Sludge Production: CaCO3 precipitated + Mg(OH)2 precipitated
  const sludgeCaCO3 = (finalCaRemoved + limeDoseAsCaCO3); 
  const sludgeMgOH2 = finalMgRemoved * MG_TO_CA_RATIO;
  const totalSludgeDaily = (sludgeCaCO3 + sludgeMgOH2) * (plant.dailyFlow || 0);

  // Clarifier Design
  const flowPerHour = ((plant.dailyFlow || 0) * 1000) / 24;
  const flowPerUnit = plant.clarifierCount > 0 ? flowPerHour / plant.clarifierCount : flowPerHour;
  const solidsPerHour = totalSludgeDaily / 24;
  const solidsPerUnit = plant.clarifierCount > 0 ? solidsPerHour / plant.clarifierCount : solidsPerHour;

  const areaHydraulic = (plant.hlr || 0) > 0 ? flowPerUnit / plant.hlr : 0;
  const areaSolids = (plant.solidsLoadingRate || 0) > 0 ? solidsPerUnit / plant.solidsLoadingRate : 0;

  const clarifierArea = Math.max(areaHydraulic, areaSolids);
  const governingParameter: 'Hydraulic' | 'Solids' = areaHydraulic >= areaSolids ? 'Hydraulic' : 'Solids';
  const clarifierDiameter = clarifierArea > 0 ? Math.sqrt((4 * clarifierArea) / Math.PI) : 0;
  const actualHLR = clarifierArea > 0 ? flowPerUnit / clarifierArea : 0;
  const actualSolidsLoading = clarifierArea > 0 ? solidsPerUnit / clarifierArea : 0;

  return {
    limeDose: limeDoseMgL || 0,
    sodaAshDose: sodaAshDoseMgL || 0,
    softeningPh: softeningPh || 10.3,
    totalLimeDaily: totalLimeDaily || 0,
    totalSodaDaily: totalSodaDaily || 0,
    totalSludgeDaily: totalSludgeDaily || 0,
    clarifierArea: isFinite(clarifierArea) ? clarifierArea : 0,
    clarifierDiameter: isFinite(clarifierDiameter) ? clarifierDiameter : 0,
    actualHLR: isFinite(actualHLR) ? actualHLR : 0,
    actualSolidsLoading: isFinite(actualSolidsLoading) ? actualSolidsLoading : 0,
    flowPerHour: flowPerHour || 0,
    governingParameter,
    achieved: {
      calcium: achievedCa,
      magnesium: achievedMg,
      totalHardness: achievedCa + achievedMg
    }
  };
};
