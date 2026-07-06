import { BrandLogo } from "@/components/app/brand-logo";
import { ThemeToggle } from "@/components/app/theme-toggle";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/60 p-4 md:p-8">
      <div className="absolute top-3 right-3">
        <ThemeToggle />
      </div>
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrandLogo className="[&>span:first-child]:size-10 [&_svg]:size-6 [&>span:last-child]:text-xl" />
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              Corteva Planner
            </h1>
            <p className="text-sm text-muted-foreground">
              Planejamento e execução comercial
            </p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
