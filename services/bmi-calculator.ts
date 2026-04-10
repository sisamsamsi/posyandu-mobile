/**
 * Calculate Body Mass Index (BMI)
 * Formula: weight (kg) / (height (m) ^ 2)
 * @param weight Weight in kilograms
 * @param height Height in centimeters
 */
export const calculateBMI = (weight: number, height: number): number => {
  if (weight <= 0 || height <= 0) return 0;
  const heightMeters = height / 100;
  return weight / (heightMeters * heightMeters);
};
