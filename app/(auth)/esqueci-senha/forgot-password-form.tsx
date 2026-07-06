"use client";

import * as React from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CircleAlert, MailCheck } from "lucide-react";
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";

const schema = z.object({
  email: z
    .string()
    .min(1, "Informe seu email.")
    .email("Informe um email válido."),
});

type Values = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const [status, setStatus] = React.useState<"idle" | "sent" | "error">(
    "idle"
  );
  const [submitting, setSubmitting] = React.useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: Values) {
    setSubmitting(true);
    setStatus("idle");

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });

    setSubmitting(false);
    setStatus(error ? "error" : "sent");
  }

  const { errors } = form.formState;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recuperar senha</CardTitle>
        <CardDescription>
          Informe seu email e enviaremos um link para redefinir a senha.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup className="gap-5">
            {status === "sent" ? (
              <Alert>
                <MailCheck />
                <AlertTitle>Solicitação registrada</AlertTitle>
                <AlertDescription>
                  Se o email existir no sistema, o link de redefinição será
                  enviado. Neste protótipo o envio de emails ainda não está
                  configurado (SMTP) — fale com a administração para
                  redefinir sua senha.
                </AlertDescription>
              </Alert>
            ) : null}
            {status === "error" ? (
              <Alert variant="destructive">
                <CircleAlert />
                <AlertTitle>Não foi possível enviar</AlertTitle>
                <AlertDescription>
                  O envio de email não está disponível neste protótipo.
                  Fale com a administração para redefinir sua senha.
                </AlertDescription>
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
              <FieldDescription>
                Você receberá um link válido por tempo limitado.
              </FieldDescription>
            </Field>
            <Button type="submit" className="h-10 w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner />
                  Enviando...
                </>
              ) : (
                "Enviar link de redefinição"
              )}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              nativeButton={false}
              render={
                <Link href="/login">
                  <ArrowLeft />
                  Voltar para o login
                </Link>
              }
            />
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
