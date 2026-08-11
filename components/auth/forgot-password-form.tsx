"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordResetAction } from "@/lib/server/actions/auth.actions";
import { initialFormState } from "@/lib/server/actions/types";
import { FieldError, FormMessage } from "./form-message";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, initialFormState);

  return (
    <div className="space-y-4">
      <FormMessage state={state} />

      {state.message ? null : (
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
            <FieldError errors={state.fieldErrors?.email} />
          </div>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            Send reset link
          </Button>
        </form>
      )}
    </div>
  );
}
