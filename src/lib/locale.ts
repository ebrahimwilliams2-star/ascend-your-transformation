// South Africa localisation defaults. Future locales plug in here.

export const DEFAULT_COUNTRY = "ZA";
export const DEFAULT_CURRENCY = "ZAR";

export const SA_PROVINCES = [
  "Western Cape",
  "Eastern Cape",
  "Northern Cape",
  "KwaZulu-Natal",
  "Gauteng",
  "Free State",
  "Mpumalanga",
  "Limpopo",
  "North West",
] as const;

export type SAProvince = typeof SA_PROVINCES[number];

export const SA_CITIES: { city: string; province: SAProvince }[] = [
  { city: "Cape Town",   province: "Western Cape" },
  { city: "Johannesburg",province: "Gauteng" },
  { city: "Pretoria",    province: "Gauteng" },
  { city: "Durban",      province: "KwaZulu-Natal" },
  { city: "Gqeberha",    province: "Eastern Cape" },
  { city: "Bloemfontein",province: "Free State" },
  { city: "East London", province: "Eastern Cape" },
  { city: "Pietermaritzburg", province: "KwaZulu-Natal" },
  { city: "Polokwane",   province: "Limpopo" },
  { city: "Nelspruit",   province: "Mpumalanga" },
  { city: "Kimberley",   province: "Northern Cape" },
  { city: "Stellenbosch",province: "Western Cape" },
];

const zarFormatter = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  maximumFractionDigits: 2,
});

export function formatZAR(value: number): string {
  return zarFormatter.format(value);
}

// Future-proof: pass a currency code; defaults to ZAR.
export function formatCurrency(value: number, currency: string = DEFAULT_CURRENCY): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

// Unit helpers — ASCEND is metric-only for now.
export const UNITS = {
  weight: "kg",
  height: "cm",
  distance: "km",
} as const;

export const FITNESS_GOALS = [
  { id: "weight_loss",   label: "Weight Loss" },
  { id: "fat_loss",      label: "Fat Loss" },
  { id: "muscle_gain",   label: "Muscle Gain" },
  { id: "strength",      label: "Strength" },
  { id: "bodybuilding",  label: "Bodybuilding" },
  { id: "powerlifting",  label: "Powerlifting" },
  { id: "running",       label: "Running" },
  { id: "general",       label: "General Fitness" },
] as const;

export const EXPERIENCE_LEVELS = [
  { id: "beginner",     label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced",     label: "Advanced" },
] as const;
