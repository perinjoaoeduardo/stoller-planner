"use client";

import * as React from "react";
import Link from "next/link";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, MoreHorizontal, Pencil, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { PersonLink } from "@/components/shared/person-link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  addChannelPerson,
  removeChannelPerson,
  setPersonBranches,
} from "@/lib/actions/channel-people";
import type {
  AssignablePerson,
  ChannelPerson,
} from "@/lib/db/channel-people";
import { cn, getInitials } from "@/lib/utils";

type Branch = { id: string; name: string };

/**
 * Time do canal — quem atua ali, com que carga, e a manutenção do
 * vínculo.
 *
 * A tela existe porque o vínculo pessoa↔canal só nascia por migration:
 * dava para VER o trabalho de alguém, nunca para dizer quem entra ou
 * sai. Sem isso, "o RTV mudou de praça" virava chamado para o time de
 * dados.
 *
 * Cada linha responde três coisas na ordem em que o gestor pergunta:
 * quem é, onde atua e como está a carga. As ações ficam no fim, atrás de
 * um menu — manutenção é exceção, não o motivo de abrir a tela.
 */
export function TeamManager({
  channelId,
  channelName,
  people,
  branches,
  assignable,
  canEdit,
}: {
  channelId: string;
  channelName: string;
  people: ChannelPerson[];
  branches: Branch[];
  assignable: AssignablePerson[];
  canEdit: boolean;
}) {
  const [addOpen, setAddOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ChannelPerson | null>(null);
  const [removing, setRemoving] = React.useState<ChannelPerson | null>(null);
  const [pending, startTransition] = React.useTransition();

  const memberIds = new Set(people.map((person) => person.profileId));
  const candidates = assignable.filter((person) => !memberIds.has(person.id));

  function remove(person: ChannelPerson) {
    startTransition(async () => {
      const result = await removeChannelPerson({
        channelId,
        linkIds: person.linkIds,
      });
      if (result.ok) {
        setRemoving(null);
        toast.success(`${person.name} saiu do time de ${channelName}.`);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground tabular-nums">
          {people.length} {people.length === 1 ? "pessoa" : "pessoas"} no time
        </p>
        {canEdit ? (
          <Button variant="brand" size="sm" onClick={() => setAddOpen(true)}>
            <UserPlus />
            Adicionar pessoa
          </Button>
        ) : null}
      </div>

      {people.length === 0 ? (
        <Empty className="rounded-2xl border border-dashed py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>Ninguém vinculado a este canal</EmptyTitle>
            <EmptyDescription>
              Sem time, ninguém recebe atividade nem registra execução aqui.
            </EmptyDescription>
          </EmptyHeader>
          {canEdit ? (
            <EmptyContent>
              <Button variant="brand" onClick={() => setAddOpen(true)}>
                <UserPlus />
                Adicionar a primeira pessoa
              </Button>
            </EmptyContent>
          ) : null}
        </Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pessoa</TableHead>
                <TableHead>Atua em</TableHead>
                <TableHead className="text-right">Abertas</TableHead>
                <TableHead className="text-right">Atrasadas</TableHead>
                <TableHead className="hidden md:table-cell">
                  Último registro
                </TableHead>
                {canEdit ? (
                  <TableHead className="w-10">
                    <span className="sr-only">Ações</span>
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {people.map((person) => (
                <TableRow key={person.profileId}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8 shrink-0">
                        {person.avatarUrl ? (
                          <AvatarImage
                            src={person.avatarUrl}
                            alt={person.name}
                          />
                        ) : null}
                        <AvatarFallback className="text-xs">
                          {getInitials(person.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <PersonLink
                          profileId={person.profileId}
                          name={person.name}
                          className="block truncate text-sm font-medium text-foreground"
                        />
                        <span className="text-xs text-muted-foreground">
                          {person.role === "DSM"
                            ? "Gestor de canais"
                            : "Consultor técnico"}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    {person.role === "DSM" ? (
                      <span className="text-sm text-muted-foreground">
                        Canal inteiro
                      </span>
                    ) : person.branches.length === 0 ? (
                      <span className="text-sm text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {person.branches.map((branch) => (
                          <Badge
                            key={branch.id}
                            variant="outline"
                            className="border-transparent bg-brand-wash text-brand-wash-fg"
                          >
                            {branch.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>

                  <TableCell className="text-right text-sm tabular-nums">
                    {person.openCount}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right text-sm tabular-nums",
                      person.lateCount > 0 && "font-medium text-warning"
                    )}
                  >
                    {person.lateCount}
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap text-sm text-muted-foreground md:table-cell">
                    {person.lastExecutionAt
                      ? formatDistanceToNow(parseISO(person.lastExecutionAt), {
                          addSuffix: true,
                          locale: ptBR,
                        })
                      : "Nunca"}
                  </TableCell>

                  {canEdit ? (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground"
                              aria-label={`Ações de ${person.name}`}
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem
                            nativeButton={false}
                            render={
                              <Link href={`/pessoas/${person.profileId}`} />
                            }
                          >
                            Ver perfil
                          </DropdownMenuItem>
                          {person.role === "RTV" ? (
                            <DropdownMenuItem
                              onClick={() => setEditing(person)}
                            >
                              <Pencil />
                              Editar filiais
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setRemoving(person)}
                          >
                            <Trash2 />
                            Tirar do canal
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AddPersonDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        channelId={channelId}
        channelName={channelName}
        branches={branches}
        candidates={candidates}
      />

      {/* key: remonta o form a cada pessoa, para o estado inicial vir das
          props sem precisar de um effect sincronizando. */}
      {editing ? (
        <EditBranchesDialog
          key={editing.profileId}
          person={editing}
          onClose={() => setEditing(null)}
          channelId={channelId}
          branches={branches}
        />
      ) : null}

      <AlertDialog
        open={removing !== null}
        onOpenChange={(open) => (open ? undefined : setRemoving(null))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Tirar {removing?.name} de {channelName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              A pessoa perde o acesso a este canal. As atividades já
              atribuídas a ela continuam no lugar — reatribua pela própria
              atividade se precisar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                if (removing) remove(removing);
              }}
            >
              {pending ? <Spinner /> : null}
              Tirar do canal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Chips de filial — multi-seleção sem checkbox, boa no toque. */
function BranchPicker({
  branches,
  selected,
  onToggle,
}: {
  branches: Branch[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {branches.map((branch) => {
        const active = selected.includes(branch.id);
        return (
          <button
            key={branch.id}
            type="button"
            onClick={() => onToggle(branch.id)}
            aria-pressed={active}
            className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors",
              active
                ? "border-accent-brand bg-accent-brand/10 text-accent-brand"
                : "border-border bg-card text-foreground hover:bg-muted"
            )}
          >
            {active ? <Check className="size-3.5" /> : null}
            {branch.name}
          </button>
        );
      })}
    </div>
  );
}

function AddPersonDialog({
  open,
  onOpenChange,
  channelId,
  channelName,
  branches,
  candidates,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string;
  channelName: string;
  branches: Branch[];
  candidates: AssignablePerson[];
}) {
  const [profileId, setProfileId] = React.useState<string | null>(null);
  const [branchIds, setBranchIds] = React.useState<string[]>([]);
  const [pending, startTransition] = React.useTransition();

  const person = candidates.find((candidate) => candidate.id === profileId);
  // O formato do vínculo vem do PAPEL, não de um seletor: DSM responde
  // pelo canal, RTV atua por filial.
  const needsBranches = person?.role === "RTV";
  const canSubmit =
    !!person && (!needsBranches || branchIds.length > 0) && !pending;

  // Reset no evento de fechar (nao em effect): setState dentro de effect
  // dispara render em cascata e o lint do projeto barra.
  function handleOpenChange(next: boolean) {
    if (!next) {
      setProfileId(null);
      setBranchIds([]);
    }
    onOpenChange(next);
  }

  function submit() {
    if (!person) return;
    startTransition(async () => {
      const result = await addChannelPerson({
        channelId,
        profileId: person.id,
        branchIds: needsBranches ? branchIds : [],
      });
      if (result.ok) {
        onOpenChange(false);
        toast.success(`${person.name} entrou no time de ${channelName}.`);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar pessoa</DialogTitle>
          <DialogDescription>
            Quem passa a atuar em {channelName}.
          </DialogDescription>
        </DialogHeader>

        {candidates.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Todo mundo do sistema já está neste canal.
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label>Pessoa</Label>
              <div className="max-h-56 overflow-y-auto rounded-lg border">
                {candidates.map((candidate) => {
                  const active = candidate.id === profileId;
                  return (
                    <button
                      key={candidate.id}
                      type="button"
                      onClick={() => {
                        setProfileId(candidate.id);
                        setBranchIds([]);
                      }}
                      aria-pressed={active}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left transition-colors",
                        active ? "bg-accent-brand/10" : "hover:bg-muted/60"
                      )}
                    >
                      <Avatar className="size-8 shrink-0">
                        {candidate.avatarUrl ? (
                          <AvatarImage
                            src={candidate.avatarUrl}
                            alt={candidate.name}
                          />
                        ) : null}
                        <AvatarFallback className="text-xs">
                          {getInitials(candidate.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {candidate.name}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {candidate.role === "DSM"
                            ? "Gestor de canais"
                            : "Consultor técnico"}
                        </span>
                      </span>
                      {active ? (
                        <Check className="size-4 shrink-0 text-accent-brand" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            {person ? (
              needsBranches ? (
                <div className="flex flex-col gap-2">
                  <Label>Filiais em que atua</Label>
                  <BranchPicker
                    branches={branches}
                    selected={branchIds}
                    onToggle={(id) =>
                      setBranchIds((current) =>
                        current.includes(id)
                          ? current.filter((value) => value !== id)
                          : [...current, id]
                      )
                    }
                  />
                  {branchIds.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Escolha pelo menos uma — é a filial que define o que
                      aparece para o consultor.
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                  Como gestor, {person.name.split(" ")[0]} responde pelo canal
                  inteiro — sem seleção de filial.
                </p>
              )
            ) : null}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="brand" disabled={!canSubmit} onClick={submit}>
            {pending ? <Spinner /> : null}
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditBranchesDialog({
  person,
  onClose,
  channelId,
  branches,
}: {
  person: ChannelPerson;
  onClose: () => void;
  channelId: string;
  branches: Branch[];
}) {
  const [branchIds, setBranchIds] = React.useState<string[]>(() =>
    person.branches.map((branch) => branch.id)
  );
  const [pending, startTransition] = React.useTransition();

  function submit() {
    startTransition(async () => {
      const result = await setPersonBranches({
        channelId,
        profileId: person.profileId,
        branchIds,
      });
      if (result.ok) {
        onClose();
        toast.success("Filiais atualizadas.");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Filiais de {person.name}</DialogTitle>
          <DialogDescription>
            A filial define o que aparece para o consultor no dia a dia.
          </DialogDescription>
        </DialogHeader>

        <BranchPicker
          branches={branches}
          selected={branchIds}
          onToggle={(id) =>
            setBranchIds((current) =>
              current.includes(id)
                ? current.filter((value) => value !== id)
                : [...current, id]
            )
          }
        />

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="brand"
            disabled={branchIds.length === 0 || pending}
            onClick={submit}
          >
            {pending ? <Spinner /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
