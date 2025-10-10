// Color definitions for scouts
const SCOUTER_COLOR_PALETTE = [
  { name: 'blue', bg: '#3b82f6', border: '#1d4ed8', css: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800' },
  { name: 'green', bg: '#10b981', border: '#047857', css: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800' },
  { name: 'purple', bg: '#8b5cf6', border: '#7c3aed', css: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800' },
  { name: 'orange', bg: '#f97316', border: '#ea580c', css: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800' },
  { name: 'pink', bg: '#ec4899', border: '#db2777', css: 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/20 dark:text-pink-300 dark:border-pink-800' },
  { name: 'indigo', bg: '#6366f1', border: '#4f46e5', css: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800' },
  { name: 'cyan', bg: '#06b6d4', border: '#0891b2', css: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-300 dark:border-cyan-800' },
  { name: 'emerald', bg: '#059669', border: '#047857', css: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800' },
];

// Generate consistent colors for scouts (CSS classes for UI components)
export const getScoutColor = (index: number) => {
  return SCOUTER_COLOR_PALETTE[index % SCOUTER_COLOR_PALETTE.length].css;
};

// Get color values for SVG/canvas rendering
export const getScoutColorValues = (index: number) => {
  const colorDef = SCOUTER_COLOR_PALETTE[index % SCOUTER_COLOR_PALETTE.length];
  return { bg: colorDef.bg, border: colorDef.border };
};

// Get all scout colors mapped by name for easy lookup
export const getScoutColorMap = (scoutNames: string[]) => {
  const colorMap: { [scoutName: string]: { bg: string; border: string } } = {};
  scoutNames.forEach((name, index) => {
    colorMap[name] = getScoutColorValues(index);
  });
  return colorMap;
};
