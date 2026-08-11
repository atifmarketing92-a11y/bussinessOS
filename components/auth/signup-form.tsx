"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { signUpAction } from "@/lib/server/actions/auth.actions";
import { initialFormState } from "@/lib/server/actions/types";
import { FieldError, FormMessage } from "./form-message";
import { GoogleSignInButton } from "./google-sign-in-button";

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUpAction, initialFormState);

  return (
    <div className="space-y-4">
      <FormMessage state={state} />

      {/* Hide the form once the "confirm your email" message is shown. */}
      {state.message ? null : (
        <>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                name="fullName"
                autoComplete="name"
                placeholder="Alex Khan"
                required
                minLength={2}
              />
              <FieldError errors={state.fieldErrors?.fullName} />
            </div>

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

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
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
              <Label htmlFor="confirmPassword">Confirm password</Label>
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
              Create account
            </Button>
          </form>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground uppercase">or</span>
            <Separator className="flex-1" />
          </div>

          <GoogleSignInButton />
        </>
      )}
    </div>
  );
}
