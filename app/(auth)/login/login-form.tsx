"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Informe seu email.")
    .email("Informe um email válido."),
  password: z.string().min(1, "Informe sua senha."),
});

type LoginValues = z.infer<typeof loginSchema>;

const DEMO_USERS = [
  { role: "DSM", email: "carlos.menezes@stoller.dev" },
  { role: "RTV", email: "joao.almeida@stoller.dev" },
  { role: "RDC", email: "luciana.freitas@stoller.dev" },
  { role: "CX", email: "camila.duarte@stoller.dev" },
] as const;

const DEMO_PASSWORD = "stoller123";

export function LoginForm() {
  const router = useRouter();
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setSubmitting(true);
    setAuthError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setSubmitting(false);
      setAuthError(
        error.message === "Invalid login credentials"
          ? "Email ou senha incorretos. Confira os dados e tente novamente."
          : "Não foi possível entrar agora. Tente novamente em instantes."
      );
      return;
    }

    router.push("/");
    router.refresh();
  }

  function fillDemo(email: string) {
    setAuthError(null);
    form.setValue("email", email, { shouldValidate: true });
    form.setValue("password", DEMO_PASSWORD, { shouldValidate: true });
  }

  const { errors } = form.formState;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
          <CardDescription>
            Use seu email corporativo para acessar o planner.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <FieldGroup className="gap-5">
              {authError ? (
                <Alert variant="destructive">
                  <CircleAlert />
                  <AlertTitle>Falha no login</AlertTitle>
                  <AlertDescription>{authError}</AlertDescription>
                </Alert>
              ) : null}
              <Field data-invalid={!!errors.email || undefined}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="nome.sobrenome@stoller.dev"
                  aria-invalid={!!errors.email}
                  {...form.register("email")}
                />
                <FieldError errors={[errors.email]} />
              </Field>
              <Field data-invalid={!!errors.password || undefined}>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="password">Senha</FieldLabel>
                  <Link
                    href="/esqueci-senha"
                    className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Esqueci minha senha
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  aria-invalid={!!errors.password}
                  {...form.register("password")}
                />
                <FieldError errors={[errors.password]} />
              </Field>
              <Button type="submit" className="h-10 w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Spinner />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Card className="border-dashed py-4">
        <CardContent className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-medium">Acesso de demonstração</p>
            <p className="text-xs text-muted-foreground">
              Preenche o formulário com um usuário de exemplo de cada perfil.
            </p>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {DEMO_USERS.map((user) => (
              <Button
                key={user.role}
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => fillDemo(user.email)}
              >
                {user.role}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
