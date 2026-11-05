import type { Database } from "@/integrations/supabase/types";

export type ProblemCategory = Database["public"]["Enums"]["problem_category"];

export const PROBLEM_CATEGORIES: { value: ProblemCategory; examples: string }[] = [
  {
    value: "Electrical",
    examples: "Stove problems, geyser problems, lights, plugs, no electricity in the unit",
  },
  {
    value: "Plumbing",
    examples: "Toilets, showers, taps, basins, leaks, blocked drains, no water",
  },
  {
    value: "Broken/Damaged",
    examples: "Broken windows, broken doors, broken desks or chairs, damaged furniture",
  },
  {
    value: "Cleaning",
    examples: "Deep cleaning, mould, pest problems, overflowing bins in shared areas",
  },
  {
    value: "Safety/Security",
    examples: "Broken locks, burglar bars, doors that don't close, exposed wiring",
  },
  {
    value: "Other",
    examples: "Anything that doesn't fit the categories above",
  },
];

export const PROBLEM_CATEGORY_VALUES = PROBLEM_CATEGORIES.map((c) => c.value);
