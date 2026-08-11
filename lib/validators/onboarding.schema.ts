import { z } from "zod";

import { CURRENCIES } from "@/lib/constants";

const currencyCodes = CURRENCIES.map((c) => c.code) as unknown as [string, ...string[]];

export const onboardingSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Business name must be at least 2 characters")
    .max(120, "Business name is too long"),
  currency: z.enum(currencyCodes, { error: "Choose a currency" }),
  country: z.string().trim().max(80).optional().or(z.literal("")),
  timezone: z.string().min(1).max(64),
  fiscalYearStartMonth: z.coerce.number().int().min(1).max(12),
  defaultTaxRate: z.coerce
    .number({ error: "Enter a valid tax rate" })
    .min(0, "Tax rate can't be negative")
    .max(100, "Tax rate can't exceed 100%"),
  addressLine1: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.email("Enter a valid email").or(z.literal("")).optional(),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
