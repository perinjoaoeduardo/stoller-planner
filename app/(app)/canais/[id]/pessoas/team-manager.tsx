"use client";

import * as React from "react";
import Link from "next/link";
import { differenceInCalendarDays, formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Check,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import { Input } from "@/components/ui/input";
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
import type { AssignablePerson, ChannelPerson } from "@/lib/db/channel-people";
import { DARK_CHANNEL_DAYS } from "@/lib/config";
import { cn, getInitials } from "@/lib/utils";

type Branch = { id: string; name: string };

const ROLE_LABEL: Record<string, string> = {
  DSM: "Gestor de canais",
  RTV: "Consultor técnico",
};

/** Busca sem acento e sem caixa — "jose" acha "José". */
function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/**
 * Time do canal — quem atua ali, com que carga, e a manutenção do
 * vínculo.
 *
 * A tela existe porque o vínculo pessoa↔canal só nascia por migration:
 * dava para VER o trabalho de alguém, nunca para dizer quem entra ou
 * sai. Sem isso, "o RTV mudou de praça" virava chamado para o time de
 * dados.
 *
 * As linhas são agrupadas por papel porque os dois são estruturalmente
 * diferentes — o gestor responde pelo canal inteiro, o consultor atua em
 * filiais. Agrupar evita reler o cargo em cada linha para entender por
 * que uma diz "Canal inteiro" e a outra lista filiais.
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
  const [search, setSearch] = React.useState("");
  const [addOpen, setAddOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ChannelPerson | null>(null);
  const [removing, setRemoving] = React.useState<ChannelPerson | null>(null);
  const [pending, startTransition] = React.useTransition();

  const memberIds = new Set(people.map((person) => person.profileId));
  const candidates = assignable.filter((person) => !memberIds.has(person.id));

  const term = normalize(search.trim());
  const filtered = term
    ? people.filter(
        (person) =>
          normalize(person.name).includes(term) ||
          person.branches.some((branch) =>
            normalize(branch.name).includes(term)
          )
      )
    : people;

  const managers = filtered.filter((person) => person.role === "DSM");
  const field = filtered.filter((person) => person.role !== "DSM");

  // A busca só aparece quando há o que procurar: em time pequeno ela é
  // moldura, não ferramenta.
  const showSearch = people.length > 5;

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

  const summary = [
    managers.length > 0
      ? `${managers.length} ${managers.length === 1 ? "gestor" : "gestores"}`
      : null,
    field.length > 0
      ? `${field.length} ${field.length === 1 ? "consultor" : "consultores"}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {showSearch ? (
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome ou filial..."
              className="h-9 w-full max-w-xs"
            />
          ) : null}
          <p className="text-sm text-muted-foreground tabular-nums">
            {summary || "Ninguém no time"}
          </p>
        </div>
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
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Ninguém encontrado com “{search}”.
          </p>
        </div>
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
              {[
                { label: "Gestão do canal", rows: managers },
                { label: "Campo", rows: field },
              ]
                .filter((group) => group.rows.length > 0)
                .map((group) => (
                  <React.Fragment key={group.label}>
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={canEdit ? 6 : 5}
                        className="bg-subtle py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground"
                      >
                        {group.label}
                      </TableCell>
                    </TableRow>
                    {group.rows.map((person) => (
                      <PersonRow
                        key={person.profileId}
                        person={person}
                        canEdit={canEdit}
                        onEdit={() => setEditing(person)}
                        onRemove={() => setRemoving(person)}
                      />
                    ))}
                  </React.Fragment>
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

function PersonRow({
  person,
  canEdit,
  onEdit,
  onRemove,
}: {
  person: ChannelPerson;
  canEdit: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const daysSinceRegister = person.lastExecutionAt
    ? differenceInCalendarDays(new Date(), parseISO(person.lastExecutionAt))
    : null;
  // Âmbar só quando a pessoa está no escuro — mesma régua de canal sem
  // registro. Um "há 3 dias" não é problema e não deve acender nada.
  const stale =
    person.role !== "DSM" &&
    (daysSinceRegister === null || daysSinceRegister >= DARK_CHANNEL_DAYS);

  return (
    <TableRow className="group/row">
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="size-8 shrink-0">
            {person.avatarUrl ? (
              <AvatarImage src={person.avatarUrl} alt={person.name} />
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
              {ROLE_LABEL[person.role] ?? person.role}
            </span>
          </div>
        </div>
      </TableCell>

      <TableCell>
        {person.role === "DSM" ? (
          <span className="text-sm text-muted-foreground">Canal inteiro</span>
        ) : person.branches.length === 0 ? (
          <span className="text-sm text-muted-foreground">Sem filial</span>
        ) : (
          <div className="flex flex-wrap items-center gap-1">
            {person.branches.map((branch) => (
              <Badge
                key={branch.id}
                variant="outline"
                className="border-transparent bg-brand-wash text-brand-wash-fg"
              >
                {branch.name}
              </Badge>
            ))}
            {/* Editar filial é a manutenção mais comum (RTV muda de
                praça), então tem atalho na própria linha além do menu. */}
            {canEdit ? (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={onEdit}
                aria-label={`Editar filiais de ${person.name}`}
                className="text-muted-foreground opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100"
              >
                <Pencil />
              </Button>
            ) : null}
          </div>
        )}
      </TableCell>

      <TableCell
        className={cn(
          "text-right text-sm tabular-nums",
          person.openCount === 0 && "text-muted-foreground"
        )}
      >
        {person.openCount}
      </TableCell>
      <TableCell
        className={cn(
          "text-right text-sm tabular-nums",
          person.lateCount > 0
            ? "font-medium text-warning"
            : "text-muted-foreground"
        )}
      >
        {person.lateCount}
      </TableCell>
      <TableCell
        className={cn(
          "hidden whitespace-nowrap text-sm md:table-cell",
          stale ? "text-warning" : "text-muted-foreground"
        )}
      >
        {person.lastExecutionAt
          ? formatDistanceToNow(parseISO(person.lastExecutionAt), {
              addSuffix: true,
              locale: ptBR,
            })
          : "Nunca registrou"}
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
                render={<Link href={`/pessoas/${person.profileId}`} />}
              >
                Ver perfil
              </DropdownMenuItem>
              {person.role !== "DSM" ? (
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil />
                  Editar filiais
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem variant="destructive" onClick={onRemove}>
                <Trash2 />
                Tirar do canal
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      ) : null}
    </TableRow>
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

  const managers = candidates.filter((candidate) => candidate.role === "DSM");
  const field = candidates.filter((candidate) => candidate.role !== "DSM");

  // Reset no evento de fechar (não em effect): setState dentro de effect
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
        handleOpenChange(false);
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
            {/* Command: busca por digitação + navegação por teclado, e
                agrupa por papel. A lista rolável sem busca não escala —
                com o cadastro real são dezenas de nomes. */}
            <Command className="rounded-lg border bg-card p-0">
              <CommandInput placeholder="Buscar pessoa..." />
              <CommandList className="max-h-60">
                <CommandEmpty>Ninguém com esse nome.</CommandEmpty>
                {[
                  { label: "Gestores de canal", rows: managers },
                  { label: "Consultores técnicos", rows: field },
                ]
                  .filter((group) => group.rows.length > 0)
                  .map((group) => (
                    <CommandGroup key={group.label} heading={group.label}>
                      {group.rows.map((candidate) => (
                        <CommandItem
                          key={candidate.id}
                          value={candidate.name}
                          onSelect={() => {
                            setProfileId(candidate.id);
                            setBranchIds([]);
                          }}
                          className="gap-3"
                        >
                          <Avatar className="size-7 shrink-0">
                            {candidate.avatarUrl ? (
                              <AvatarImage
                                src={candidate.avatarUrl}
                                alt={candidate.name}
                              />
                            ) : null}
                            <AvatarFallback className="text-[10px]">
                              {getInitials(candidate.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="min-w-0 flex-1 truncate">
                            {candidate.name}
                          </span>
                          {candidate.id === profileId ? (
                            <Check className="size-4 shrink-0 text-accent-brand" />
                          ) : null}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ))}
              </CommandList>
            </Command>

            {person ? (
              needsBranches ? (
                <div className="flex flex-col gap-2">
                  <Label>Filiais de {person.name.split(" ")[0]}</Label>
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

  const allSelected = branchIds.length === branches.length;

  return (
    <Dialog open onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Filiais de {person.name}</DialogTitle>
          <DialogDescription>
            A filial define o que aparece para o consultor no dia a dia.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
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
          {branches.length > 2 ? (
            <button
              type="button"
              onClick={() =>
                setBranchIds(
                  allSelected ? [] : branches.map((branch) => branch.id)
                )
              }
              className="w-fit cursor-pointer text-xs text-accent-brand underline-offset-4 hover:underline"
            >
              {allSelected ? "Limpar seleção" : "Selecionar todas"}
            </button>
          ) : null}
          {branchIds.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Sem nenhuma filial o consultor não vê nada deste canal — se a
              ideia é tirá-lo daqui, use “Tirar do canal”.
            </p>
          ) : null}
        </div>

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
