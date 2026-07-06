import { AppSidebar } from "@/components/app/app-sidebar";
import { AppTopbar } from "@/components/app/app-topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getCurrentProfile } from "@/lib/auth/scope";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await getCurrentProfile();

  return (
    <SidebarProvider>
      <AppSidebar role={profile.role} />
      <SidebarInset>
        <AppTopbar
          user={{
            name: profile.fullName,
            email: profile.email,
            role: profile.role,
          }}
        />
        <main className="flex flex-1 flex-col bg-background">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
