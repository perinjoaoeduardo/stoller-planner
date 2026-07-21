"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Camera,
  Check,
  KeyRound,
  Link2,
  Lock,
  LogOut,
  Monitor,
  Moon,
  Palette,
  ShieldCheck,
  Store,
  MapPin,
  Sun,
  User as UserIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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
import { Input } from "@/components/ui/input";
import { Item, ItemGroup } from "@/components/ui/item";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { signOut } from "@/lib/auth/actions";
import { ROLE_LABELS, type Role } from "@/lib/auth/nav";
import {
  getMyLinks,
  updateAvatarUrl,
  updateProfileName,
} from "@/lib/actions/settings";
import type { UserLinksSummary } from "@/lib/db/settings";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Configurações em modal (referência: block sidebar-13) — navegação
 * lateral no desktop, chips horizontais no mobile. Seções: Perfil,
 * Aparência, Meus vínculos (transparência do escopo) e Conta.
 */

export type SettingsUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
};

type SectionId = "perfil" | "aparencia" | "vinculos" | "conta";

const SECTIONS: { id: SectionId; label: string; icon: typeof UserIcon }[] = [
  { id: "perfil", label: "Perfil", icon: UserIcon },
  { id: "aparencia", label: "Aparência", icon: Palette },
  { id: "vinculos", label: "Meus vínculos", icon: Link2 },
  { id: "conta", label: "Conta", icon: ShieldCheck },
];

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ""}${
    parts.length > 1 ? parts[parts.length - 1][0] : ""
  }`.toUpperCase();
}

export function SettingsDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: SettingsUser;
}) {
  const [section, setSection] = React.useState<SectionId>("perfil");

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (next) setSection("perfil");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Configurações</DialogTitle>
          <DialogDescription>
            Preferências do perfil, aparência, vínculos e conta.
          </DialogDescription>
        </DialogHeader>

        <div className="flex h-[min(80svh,600px)] min-w-0 max-w-full flex-col sm:flex-row">
          {/* Navegação: coluna no desktop, chips no mobile */}
          <nav className="flex shrink-0 gap-1 overflow-x-auto border-b bg-muted/40 p-2 pr-12 sm:w-52 sm:flex-col sm:border-r sm:border-b-0 sm:p-3 sm:pr-3">
            <p className="hidden px-3 pt-1 pb-2 text-xs font-medium text-muted-foreground sm:block">
              Configurações
            </p>
            {SECTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={cn(
                  "flex min-h-9 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-medium transition-colors",
                  section === item.id
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {section === "perfil" ? <ProfileSection user={user} /> : null}
            {section === "aparencia" ? <AppearanceSection /> : null}
            {section === "vinculos" ? (
              <LinksSection role={user.role} loadWhenVisible={open} />
            ) : null}
            {section === "conta" ? <AccountSection user={user} /> : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Perfil ──────────────────────────────────────────────────────── */

const ACCEPTED_AVATAR = ["image/jpeg", "image/png", "image/webp"];

function ProfileSection({ user }: { user: SettingsUser }) {
  const router = useRouter();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [name, setName] = React.useState(user.name);
  const [avatarUrl, setAvatarUrl] = React.useState(user.avatarUrl);
  const [uploading, setUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  async function handleAvatarChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!ACCEPTED_AVATAR.includes(file.type) || file.size > 5 * 1024 * 1024) {
      toast.error("Use uma imagem JPG, PNG ou WEBP de até 5MB.");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${user.id}-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const result = await updateAvatarUrl(data.publicUrl);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setAvatarUrl(data.publicUrl);
      toast.success("Foto atualizada!");
      router.refresh();
    } catch {
      toast.error("Falha ao enviar a foto. Tente de novo.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const result = await updateProfileName(name);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Alterações salvas!");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const dirty = name.trim() !== user.name;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold">Perfil</h2>
        <p className="text-sm text-muted-foreground">
          Como você aparece para o time no planner.
        </p>
      </div>

      <div className="flex items-center gap-4 rounded-2xl border bg-card p-4">
        <Avatar className="size-16">
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt={`Foto de ${user.name}`} />
          ) : null}
          <AvatarFallback className="bg-primary text-lg font-medium text-primary-foreground">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1.5">
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED_AVATAR.join(",")}
            className="hidden"
            onChange={handleAvatarChange}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? <Spinner /> : <Camera />}
            {uploading ? "Enviando..." : "Alterar foto"}
          </Button>
          <p className="text-xs text-muted-foreground">
            JPG, PNG ou WEBP, até 5MB.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-nome">Nome completo</Label>
          <Input
            id="settings-nome"
            value={name}
            maxLength={120}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-email">Email</Label>
          <Tooltip>
            <TooltipTrigger
              render={
                <div>
                  <Input
                    id="settings-email"
                    value={user.email}
                    readOnly
                    disabled
                  />
                </div>
              }
            />
            <TooltipContent>Gerenciado pela conta</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Cargo</Label>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Definido pela administração.
          </p>
        </div>

        <div className="flex justify-end">
          <Button size="sm" disabled={!dirty || saving} onClick={handleSave}>
            {saving ? <Spinner /> : <Check />}
            Salvar alterações
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Aparência ───────────────────────────────────────────────────── */

const THEMES = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
] as const;

/**
 * Miniatura dos temas. ÚNICO lugar do app onde cor crua é correta: estas
 * células representam o tema QUE NÃO ESTÁ ATIVO (o preview do dark
 * precisa ficar escuro enquanto você está no light). Trocar por token
 * faria as três miniaturas ficarem idênticas ao tema atual.
 */
function ThemePreview({ theme }: { theme: "light" | "dark" | "system" }) {
  const half = theme === "system";
  const dark = theme === "dark";
  return (
    <div
      aria-hidden
      className={cn(
        "relative h-16 w-full overflow-hidden rounded-lg border",
        dark ? "bg-zinc-900" : "bg-card"
      )}
    >
      {half ? (
        <div className="absolute inset-y-0 right-0 w-1/2 bg-zinc-900" />
      ) : null}
      <div className="relative flex h-full flex-col gap-1.5 p-2">
        <div
          className={cn(
            "h-1.5 w-8 rounded-full",
            dark ? "bg-zinc-600" : "bg-zinc-300"
          )}
        />
        <div className="h-1.5 w-14 rounded-full bg-primary/70" />
        <div
          className={cn(
            "h-1.5 w-10 rounded-full",
            dark ? "bg-zinc-700" : "bg-zinc-200"
          )}
        />
      </div>
    </div>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold">Aparência</h2>
        <p className="text-sm text-muted-foreground">
          Escolha o tema do planner. Aplica na hora.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {THEMES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            className={cn(
              "flex flex-col gap-2 rounded-2xl border p-3 text-left transition-colors",
              theme === option.value
                ? "border-primary ring-2 ring-primary/30"
                : "hover:bg-muted/50"
            )}
          >
            <ThemePreview theme={option.value} />
            <span className="flex items-center gap-2 text-sm font-medium">
              <option.icon className="size-4" />
              {option.label}
              {theme === option.value ? (
                <Check className="ml-auto size-4 text-primary" />
              ) : null}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Meus vínculos ───────────────────────────────────────────────── */

function LinksSection({
  role,
  loadWhenVisible,
}: {
  role: Role;
  loadWhenVisible: boolean;
}) {
  const [links, setLinks] = React.useState<UserLinksSummary | null>(null);

  React.useEffect(() => {
    if (!loadWhenVisible || links !== null) return;
    let cancelled = false;
    getMyLinks()
      .then((data) => {
        if (!cancelled) setLinks(data);
      })
      .catch(() => {
        if (!cancelled) setLinks({ kind: "all" });
      });
    return () => {
      cancelled = true;
    };
  }, [loadWhenVisible, links]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold">Meus vínculos</h2>
        <p className="text-sm text-muted-foreground">
          O que você enxerga no planner, definido pelos seus vínculos.
        </p>
      </div>

      {links === null ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      ) : role === "CX" || links.kind === "all" ? (
        <div className="flex items-start gap-3 rounded-2xl border bg-card p-4">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <p className="font-medium">Acesso total</p>
            <p className="text-sm text-muted-foreground">
              Você visualiza todas as regiões, canais e filiais.
            </p>
          </div>
        </div>
      ) : links.kind === "channels" ? (
        <ItemGroup className="gap-2">
          {links.channels.map((channel) => (
            <Item key={channel.id} variant="outline" size="sm">
              <Store className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{channel.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {channel.regionName} ·{" "}
                  {channel.branchCount === 1
                    ? "1 filial"
                    : `${channel.branchCount} filiais`}
                </p>
              </div>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span>
                      <Lock className="size-3.5 text-muted-foreground" />
                    </span>
                  }
                />
                <TooltipContent>Somente leitura</TooltipContent>
              </Tooltip>
            </Item>
          ))}
        </ItemGroup>
      ) : (
        <ItemGroup className="gap-2">
          {links.branches.map((branch) => (
            <Item key={branch.id} variant="outline" size="sm">
              <MapPin className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {branch.name} · {branch.city}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {branch.channelName}
                </p>
              </div>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span>
                      <Lock className="size-3.5 text-muted-foreground" />
                    </span>
                  }
                />
                <TooltipContent>Somente leitura</TooltipContent>
              </Tooltip>
            </Item>
          ))}
        </ItemGroup>
      )}

      <p className="text-xs text-muted-foreground">
        Precisa de acesso a mais canais ou filiais? Fale com o time de CX.
      </p>
    </div>
  );
}

/* ── Conta ───────────────────────────────────────────────────────── */

const passwordSchema = z
  .object({
    current: z.string().min(1, "Informe sua senha atual."),
    next: z.string().min(8, "A nova senha precisa de ao menos 8 caracteres."),
    confirm: z.string(),
  })
  .refine((values) => values.next === values.confirm, {
    message: "As senhas não conferem.",
    path: ["confirm"],
  });

type PasswordForm = z.infer<typeof passwordSchema>;

function AccountSection({ user }: { user: SettingsUser }) {
  const [passwordOpen, setPasswordOpen] = React.useState(false);
  const [signingOut, startSignOut] = React.useTransition();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold">Conta</h2>
        <p className="text-sm text-muted-foreground">
          Segurança e acesso da sua conta.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">Senha</p>
          <p className="text-sm text-muted-foreground">
            Troque sua senha de acesso ao planner.
          </p>
        </div>
        <Button
          variant="outline"
          className="shrink-0"
          onClick={() => setPasswordOpen(true)}
        >
          <KeyRound />
          Alterar senha
        </Button>
      </div>

      <Separator />

      <div className="flex flex-col gap-3 rounded-2xl border border-destructive/30 bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">Sair</p>
          <p className="text-sm text-muted-foreground">
            Encerra sua sessão neste dispositivo.
          </p>
        </div>
        <Button
          variant="outline"
          className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={signingOut}
          onClick={() => startSignOut(() => signOut())}
        >
          <LogOut />
          {signingOut ? "Saindo..." : "Sair"}
        </Button>
      </div>

      <PasswordDialog
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
        email={user.email}
      />
    </div>
  );
}

function PasswordDialog({
  open,
  onOpenChange,
  email,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
}) {
  const form = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current: "", next: "", confirm: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: PasswordForm) {
    const supabase = createClient();

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email,
      password: values.current,
    });
    if (verifyError) {
      form.setError("current", { message: "Senha atual incorreta." });
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: values.next,
    });
    if (error) {
      toast.error("Não foi possível alterar a senha. Tente de novo.");
      return;
    }

    toast.success("Senha alterada!");
    form.reset();
    onOpenChange(false);
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Alterar senha</DialogTitle>
          <DialogDescription>
            Confirme a senha atual e escolha a nova.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="senha-atual">Senha atual</Label>
            <Input
              id="senha-atual"
              type="password"
              autoComplete="current-password"
              {...form.register("current")}
            />
            {errors.current ? (
              <p className="text-xs text-destructive">
                {errors.current.message}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="senha-nova">Nova senha</Label>
            <Input
              id="senha-nova"
              type="password"
              autoComplete="new-password"
              {...form.register("next")}
            />
            {errors.next ? (
              <p className="text-xs text-destructive">{errors.next.message}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="senha-confirmar">Confirmar nova senha</Label>
            <Input
              id="senha-confirmar"
              type="password"
              autoComplete="new-password"
              {...form.register("confirm")}
            />
            {errors.confirm ? (
              <p className="text-xs text-destructive">
                {errors.confirm.message}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Spinner /> : <KeyRound />}
              Alterar senha
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
