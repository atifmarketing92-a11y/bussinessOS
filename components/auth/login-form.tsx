"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  signInWithMagicLinkAction,
  signInWithPasswordAction,
} from "@/lib/server/actions/auth.actions";
import { initialFormState } from "@/lib/server/actions/types";
import { FieldError, FormMessage } from "./form-message";
import { GoogleSignInButton } from "./google-sign-in-button";

export function LoginForm({ next }: { next?: string }) {
  const [mode, setMode] = useState<"password" | "magic-link">("password");
  const action = mode === "password" ? signInWithPasswordAction : signInWithMagicLinkAction;
  const [state, formAction, pending] = useActionState(action, initialFormState);

  return (
    <div className="space-y-4">
      <FormMessage state={state} />

      <form action={formAction} className="space-y-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}

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

        {mode === "password" ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
            <FieldError errors={state.fieldErrors?.password} />
          </div>
        ) : null}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          {mode === "password" ? "Sign in" : "Email me a sign-in link"}
        </Button>
      </form>

      <button
        type="button"
        className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
        onClick={() => setMode(mode === "password" ? "magic-link" : "password")}
      >
        {mode === "password"
          ? "Sign in with an emailed link instead"
          : "Sign in with password instead"}
      </button>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground uppercase">or</span>
        <Separator className="flex-1" />
      </div>

      <GoogleSignInButton />
    </div>
  );
}
