export const KG_TO_LB = 2.20462262;

/**
 * Convert from database value (KG) to displayed value (KG or Lb)
 */
export const toDisplayWeight = (kgVal: number | string | undefined | null, unit: 'kg' | 'lb'): number => {
  if (kgVal === undefined || kgVal === null) return 0;
  const num = typeof kgVal === 'string' ? parseFloat(kgVal) : kgVal;
  if (isNaN(num)) return 0;
  if (unit === 'lb') {
    return Math.round(num * KG_TO_LB * 10) / 10; // Round to 1 decimal place (e.g., 22.5 Lb)
  }
  return num;
};

/**
 * Convert from inputted value (KG or Lb) to database value (always KG)
 */
export const toDatabaseWeight = (inputVal: number | string | undefined | null, unit: 'kg' | 'lb'): number => {
  if (inputVal === undefined || inputVal === null) return 0;
  const num = typeof inputVal === 'string' ? parseFloat(inputVal) : inputVal;
  if (isNaN(num)) return 0;
  if (unit === 'lb') {
    return Math.round((num / KG_TO_LB) * 100) / 100; // Round to 2 decimal places in KG for DB storage
  }
  return num;
};

/**
 * Format a weight value with its respective initial (KG or Lb)
 */
export const formatWeightDisplay = (kgVal: number | string | undefined | null, unit: 'kg' | 'lb'): string => {
  const num = toDisplayWeight(kgVal, unit);
  const suffix = unit === 'lb' ? 'Lb' : 'KG';
  return `${num} ${suffix}`;
};
