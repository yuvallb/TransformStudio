export const DEMOS = [
  {
    id: 'sales-analysis',
    label: 'Sales analysis',
    description: 'CSV → Filter → GroupBy → Output',
    file: `${import.meta.env.BASE_URL}demo/sales-analysis.tstudio.json`,
  },
  {
    id: 'customer-join',
    label: 'Customer join',
    description: 'Two sources → Join → Select → Output',
    file: `${import.meta.env.BASE_URL}demo/customer-join.tstudio.json`,
  },
  {
    id: 'parameterized-filter',
    label: 'Parameterized filter',
    description: 'Filter with {country} parameter',
    file: `${import.meta.env.BASE_URL}demo/parameterized-filter.tstudio.json`,
  },
] as const;

export type Demo = (typeof DEMOS)[number];
