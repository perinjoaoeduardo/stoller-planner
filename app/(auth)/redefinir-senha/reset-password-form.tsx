"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CircleAlert } from "lucide-react";
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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";

const schema = z
  .object({
    password: z.string().min(8, "A senha precisa de pelo menos 8 caracteres."),
    confirm: z.string().min(1, "Confirme a nova senha."),
  })
  .refine((values) => values.password === values.confirm, {
    message: "As senhas não coincidem.",
    path: ["confirm"],
  });

type Values = z.infer<typeof schema>;

type SessionState = "checking" | "ready" | "invalid";

export function ResetPasswordForm() {
  const router = useRouter();
  const [sessionState, setSessionState] =
    React.useState<SessionState>("checking");
  const [updateError, setUpdateError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    const supabase = createClient();
    const code = new URLSearchParams(window.location.search).get("code");

    async function prepare() {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) return true;
      }
      const { data } = await supabase.auth.getUser();
      return !!data.user;
    }

    prepare().then((ok) => {
      setSessionState(ok ? "ready" : "invalid");
    });
  }, []);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });

  async function onSubmit(values: Values) {
    setSubmitting(true);
    setUpdateError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });

    if (error) {
      setSubmitting(false);
      setUpdateError(
        "Não foi possível atualizar a senha. O link pode ter expirado — solicite um novo."
      );
      return;
    }

    router.push("/");
    router.refresh();
  }

  const { errors } = form.formState;

  if (sessionState === "checking") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Redefinir senha</CardTitle>
          <CardDescription>Validando seu link de recuperação...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (sessionState === "invalid") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Redefinir senha</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <CircleAlert />
            <AlertTitle>Link inválido ou expirado</AlertTitle>
            <AlertDescription>
              Abra esta página pelo link enviado no email de recuperação ou
              solicite um novo em &quot;Esqueci minha senha&quot;.
            </AlertDescription>
          </Alert>
          <Button
            variant="outline"
            className="w-full"
            nativeButton={false}
            render={
              <Link href="/login">
                <ArrowLeft />
                Voltar para o login
              </Link>
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Redefinir senha</CardTitle>
        <CardDescription>
          Defina a nova senha da sua conta.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup className="gap-5">
            {updateError ? (
              <Alert variant="destructive">
                <CircleAlert />
                <AlertTitle>Falha ao redefinir</AlertTitle>
                <AlertDescription>{updateError}</AlertDescription>
              </Alert>
            ) : null}
            <Field data-invalid={!!errors.password || undefined}>
              <FieldLabel htmlFor="password">Nova senha</FieldLabel>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                {...form.register("password")}
              />
              <FieldError errors={[errors.password]} />
            </Field>
            <Field data-invalid={!!errors.confirm || undefined}>
              <FieldLabel htmlFor="confirm">Confirmar nova senha</FieldLabel>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!errors.confirm}
                {...form.register("confirm")}
              />
              <FieldError errors={[errors.confirm]} />
            </Field>
            <Button type="submit" className="h-10 w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner />
                  Salvando...
                </>
              ) : (
                "Salvar nova senha"
              )}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
