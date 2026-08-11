/**
 * Shared result type for all Server Actions.
 *
 * Actions never throw raw errors to the UI: they return a typed result so
 * forms can render friendly messages and fields can show targeted errors.
 */
export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/** State passed through `useActionState` forms. */
export interface FormState {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[]>;
}

export const initialFormState: FormState = {};
