import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Rotas acessíveis sem sessão. */
const PUBLIC_PATHS = ["/login", "/esqueci-senha", "/redefinir-senha"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: nada de lógica entre createServerClient e getUser —
  // isso pode causar logout aleatório dos usuários.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  function redirectTo(pathnameTarget: string) {
    const url = request.nextUrl.clone();
    url.pathname = pathnameTarget;
    url.search = "";
    const redirect = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirect.cookies.set(cookie.name, cookie.value);
    });
    return redirect;
  }

  // Sem sessão em rota interna → login
  if (!user && !isPublicPath(pathname)) {
    return redirectTo("/login");
  }

  // Com sessão no /login → home (as demais rotas públicas continuam
  // acessíveis: redefinir senha usa a sessão de recuperação ativa)
  if (user && pathname === "/login") {
    return redirectTo("/");
  }

  return supabaseResponse;
}
