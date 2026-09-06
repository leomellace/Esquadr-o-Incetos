import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next 16 renomeou Middleware para Proxy (e mudou o runtime padrão de
// Edge para Node.js) — `middleware.ts` é a convenção antiga, deprecated,
// migrada com o codemod oficial `@next/codemod middleware-to-proxy`. O
// nome do arquivo e da função exportada são o que o Next procura; não é
// estilo. Ver node_modules/next/dist/docs/.../proxy.md > "Migration to Proxy".
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
