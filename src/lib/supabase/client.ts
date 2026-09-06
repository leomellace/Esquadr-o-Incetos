import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

export function createClient() {
  return createBrowserClient<Database, "incetos">(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: "incetos" } },
  );
}

let browserClient: ReturnType<typeof createClient> | undefined;

/**
 * Instância única do cliente browser. Evita abrir um novo WS de Realtime
 * a cada componente que precisa do Supabase — todos compartilham o mesmo.
 */
export function getBrowserClient() {
  if (!browserClient) browserClient = createClient();
  return browserClient;
}
