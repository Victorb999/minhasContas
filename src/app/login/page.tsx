"use client";

import { useActionState } from "react";
import { CircleAlert, LockKeyhole } from "lucide-react";
import { login } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, null);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <Logo className="size-14" />
        <h1 className="text-2xl font-semibold tracking-tight">Minhas Contas</h1>
        <p className="text-sm text-muted-foreground">Digite a senha para continuar</p>
      </div>
      <form action={action} className="flex w-full max-w-xs flex-col gap-3">
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Senha"
            autoFocus
            className="h-12 pl-9 text-base"
            aria-invalid={state?.ok === false || undefined}
            aria-describedby="login-error"
          />
        </div>
        <div id="login-error" aria-live="polite">
          {state?.ok === false && (
            <p className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <CircleAlert className="mt-0.5 size-4 shrink-0" />
              {state.error}
            </p>
          )}
        </div>
        <Button type="submit" size="lg" className="h-12 text-base" disabled={pending}>
          {pending ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </main>
  );
}
