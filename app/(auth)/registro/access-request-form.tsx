"use client";

import * as React from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, MailCheck, Send } from "lucide-react";
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
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { submitAccessRequest } from "@/lib/actions/access-request";
import { ROLE_LABELS, type Role } from "@/lib/auth/nav";

/**
 * O acesso ao planner é controlado: este formulário NÃO cria usuário
 * no Auth — grava a solicitação em access_requests para o CX avaliar
 * e criar a conta com os vínculos certos. Com o SSO Microsoft em
 * produção, esta tela tende a ser substituída pelo fluxo SSO e a
 * tabela vira fila de aprovação.
 */

const ROLES: Role[] = ["DSM", "RTV", "CX"];

const requestSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "Informe seu nome completo.")
    .max(120, "Máximo de 120 caracteres."),
  email: z
    .string()
    .trim()
    .min(1, "Informe seu email.")
    .email("Informe um email válido."),
  requestedRole: z.enum(["DSM", "RTV", "CX"], {
    message: "Escolha o cargo pretendido.",
  }),
  message: z.string().trim().max(500, "Máximo de 500 caracteres.").optional(),
});

type RequestValues = z.infer<typeof requestSchema>;

export function AccessRequestForm() {
  const [sent, setSent] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<RequestValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: { fullName: "", email: "", message: "" },
  });
  const { errors, isSubmitting } = form.formState;
  const requestedRole = form.watch("requestedRole");

  async function onSubmit(values: RequestValues) {
    setServerError(null);
    const result = await submitAccessRequest(values);
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <Card>
        <CardContent>
          <Empty className="py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MailCheck />
              </EmptyMedia>
              <EmptyTitle>Solicitação enviada!</EmptyTitle>
              <EmptyDescription>
                O time de CX vai avaliar seu acesso e entrar em contato
                pelo email informado.
              </EmptyDescription>
            </EmptyHeader>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/login">Voltar para o login</Link>}
            />
          </Empty>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Solicitar acesso</CardTitle>
          <CardDescription>
            O acesso ao planner é criado pelo time de CX. Conte quem você
            é e o que precisa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <FieldGroup className="gap-5">
              {serverError ? (
                <Alert variant="destructive">
                  <CircleAlert />
                  <AlertTitle>Falha ao enviar</AlertTitle>
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              ) : null}

              <Field data-invalid={!!errors.fullName || undefined}>
                <FieldLabel htmlFor="nome">Nome completo</FieldLabel>
                <Input
                  id="nome"
                  autoComplete="name"
                  placeholder="Maria da Silva"
                  aria-invalid={!!errors.fullName}
                  {...form.register("fullName")}
                />
                <FieldError errors={[errors.fullName]} />
              </Field>

              <Field data-invalid={!!errors.email || undefined}>
                <FieldLabel htmlFor="email">Email corporativo</FieldLabel>
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

              <Field data-invalid={!!errors.requestedRole || undefined}>
                <FieldLabel htmlFor="cargo">Cargo pretendido</FieldLabel>
                <Select
                  value={requestedRole ?? null}
                  onValueChange={(value) =>
                    form.setValue("requestedRole", value as Role, {
                      shouldValidate: true,
                    })
                  }
                  items={ROLES.map((role) => ({
                    value: role,
                    label: ROLE_LABELS[role],
                  }))}
                >
                  <SelectTrigger
                    id="cargo"
                    className="w-full"
                    aria-invalid={!!errors.requestedRole}
                  >
                    <SelectValue placeholder="Escolha o cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[errors.requestedRole]} />
              </Field>

              <Field data-invalid={!!errors.message || undefined}>
                <FieldLabel htmlFor="mensagem">
                  Mensagem{" "}
                  <span className="font-normal text-muted-foreground">
                    (opcional)
                  </span>
                </FieldLabel>
                <Textarea
                  id="mensagem"
                  maxLength={500}
                  placeholder="Ex: Sou RTV da regional Centro-Oeste e atendo as filiais de Sorriso e Rondonópolis."
                  aria-invalid={!!errors.message}
                  {...form.register("message")}
                />
                <FieldError errors={[errors.message]} />
              </Field>

              <Button
                type="submit"
                className="h-10 w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Spinner />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send />
                    Enviar solicitação
                  </>
                )}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link
          href="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Entrar
        </Link>
      </p>
    </div>
  );
}
