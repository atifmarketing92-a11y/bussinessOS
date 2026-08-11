"use client";

import { useTransition, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CURRENCIES, MONTHS } from "@/lib/constants";
import { completeOnboarding } from "@/lib/server/actions/onboarding.actions";
import { cn } from "@/lib/utils";

const STEPS = ["Business", "Basics", "Details"] as const;

interface WizardState {
  name: string;
  currency: string;
  country: string;
  fiscalYearStartMonth: number;
  defaultTaxRate: string;
  addressLine1: string;
  city: string;
  phone: string;
  email: string;
}

const initialState: WizardState = {
  name: "",
  currency: "USD",
  country: "",
  fiscalYearStartMonth: 1,
  defaultTaxRate: "0",
  addressLine1: "",
  city: "",
  phone: "",
  email: "",
};

export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(initialState);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  function update<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: [] }));
  }

  function next() {
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await completeOnboarding({
        ...state,
        timezone,
        defaultTaxRate: state.defaultTaxRate,
        fiscalYearStartMonth: state.fiscalYearStartMonth,
      });
      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        setError(result.error);
      }
      // On success the server action redirects to /dashboard.
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="mb-2 flex items-center gap-2" aria-hidden>
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs font-medium",
                  i < step && "bg-primary text-primary-foreground",
                  i === step && "bg-primary text-primary-foreground",
                  i > step && "bg-muted text-muted-foreground",
                )}
              >
                {i < step ? <Check className="size-3.5" /> : i + 1}
              </span>
              {i < STEPS.length - 1 ? <span className="h-px w-8 bg-border" /> : null}
            </div>
          ))}
        </div>
        <CardTitle className="text-xl">
          {step === 0 && "Tell us about your business"}
          {step === 1 && "A few basics"}
          {step === 2 && "Optional details"}
        </CardTitle>
        <CardDescription>
          {step === 0 && "This is the name that appears on your dashboard and invoices."}
          {step === 1 && "You can change these later in Settings."}
          {step === 2 && "Skip anything you're not sure about — everything here is optional."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {step === 0 ? (
          <div className="space-y-2">
            <Label htmlFor="name">Business name</Label>
            <Input
              id="name"
              value={state.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. Acme Store"
              autoFocus
            />
            {fieldErrors.name?.[0] ? (
              <p className="text-sm text-destructive" role="alert">
                {fieldErrors.name[0]}
              </p>
            ) : null}
          </div>
        ) : null}

        {step === 1 ? (
          <>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={state.currency} onValueChange={(v) => update("currency", v)}>
                <SelectTrigger aria-label="Currency">
                  <SelectValue placeholder="Choose currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.currency?.[0] ? (
                <p className="text-sm text-destructive" role="alert">
                  {fieldErrors.currency[0]}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country (optional)</Label>
              <Input
                id="country"
                value={state.country}
                onChange={(e) => update("country", e.target.value)}
                placeholder="e.g. Pakistan"
              />
            </div>

            <div className="space-y-2">
              <Label>Fiscal year starts in</Label>
              <Select
                value={String(state.fiscalYearStartMonth)}
                onValueChange={(v) => update("fiscalYearStartMonth", Number(v))}
              >
                <SelectTrigger aria-label="Fiscal year start month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month, i) => (
                    <SelectItem key={month} value={String(i + 1)}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Used for yearly reports. Most businesses pick January; pick July for Pakistan&apos;s
                tax year.
              </p>
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="defaultTaxRate">Default tax rate (%)</Label>
              <Input
                id="defaultTaxRate"
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step="0.01"
                value={state.defaultTaxRate}
                onChange={(e) => update("defaultTaxRate", e.target.value)}
              />
              {fieldErrors.defaultTaxRate?.[0] ? (
                <p className="text-sm text-destructive" role="alert">
                  {fieldErrors.defaultTaxRate[0]}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Applied to new sales and invoices by default. Use 0 if you don&apos;t charge tax.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="addressLine1">Address (optional)</Label>
              <Input
                id="addressLine1"
                value={state.addressLine1}
                onChange={(e) => update("addressLine1", e.target.value)}
                placeholder="Street address"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">City (optional)</Label>
                <Input
                  id="city"
                  value={state.city}
                  onChange={(e) => update("city", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={state.phone}
                  onChange={(e) => update("phone", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Business email (optional)</Label>
              <Input
                id="email"
                type="email"
                value={state.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="Shown on invoices"
              />
              {fieldErrors.email?.[0] ? (
                <p className="text-sm text-destructive" role="alert">
                  {fieldErrors.email[0]}
                </p>
              ) : null}
            </div>
          </>
        ) : null}

        <div className="flex items-center justify-between pt-2">
          <Button type="button" variant="ghost" onClick={back} disabled={step === 0 || isPending}>
            <ArrowLeft /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              onClick={next}
              disabled={step === 0 && state.name.trim().length < 2}
            >
              Continue <ArrowRight />
            </Button>
          ) : (
            <Button type="button" onClick={submit} disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : <Check />}
              Create my business
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
