"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePasswordAction } from "@/lib/server/actions/auth.actions";
import { initialFormState } from "@/lib/server/actions/types";
import { FieldError, FormMessage } from "./form-message";

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePasswordAction, initialFormState);

  return (
    <div className="space-y-4">
      <FormMessage state={state} />

      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
          <FieldError errors={state.fieldErrors?.password} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
          />
          <FieldError errors={state.fieldErrors?.confirmPassword} />
        </div>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          Set new password
        </Button>
      </form>
    </div>
  );
}
