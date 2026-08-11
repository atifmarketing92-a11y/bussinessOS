import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import type { FormState } from "@/lib/server/actions/types";

/** Renders a server-action result as an accessible inline alert. */
export function FormMessage({ state }: { state: FormState }) {
  if (state.error) {
    return (
      <Alert variant="destructive" role="alert">
        <AlertCircle aria-hidden />
        <AlertDescription>{state.error}</AlertDescription>
      </Alert>
    );
  }
  if (state.message) {
    return (
      <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
        <CheckCircle2 aria-hidden />
        <AlertDescription>{state.message}</AlertDescription>
      </Alert>
    );
  }
  return null;
}

export function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p className="text-sm text-destructive" role="alert">
      {errors[0]}
    </p>
  );
}
