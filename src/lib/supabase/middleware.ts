import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

// Mantém o cookie de sessão do Supabase vivo entre requisições.
// Sem isso, sessões anônimas expiram silenciosamente em Server Components.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // O middleware roda em TODA requisição, sem exceção — se essas duas
  // variáveis estiverem ausentes (nome errado no painel do host, ambiente
  // sem elas configuradas), `createServerClient` lança na hora, e o site
  // inteiro cai com 500 em vez de só a sessão anônima não renovar. Um
  // deploy mal configurado tem que degradar para "sem sessão", nunca
  // para "página nenhuma carrega".
  if (!url || !anonKey) {
    console.error(
      "[middleware] NEXT_PUBLIC_SUPABASE_URL/ANON_KEY ausentes — sessão não renovada nesta requisição.",
    );
    return response;
  }

  const supabase = createServerClient<Database, "incetos">(url, anonKey, {
    db: { schema: "incetos" },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}
