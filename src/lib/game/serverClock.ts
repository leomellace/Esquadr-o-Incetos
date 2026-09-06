import { getBrowserClient } from "@/lib/supabase/client";

// Corrige o relógio do bomba-relógio contra o relógio do dispositivo
// do jogador, não contra o servidor diretamente.
//
// O timer da bomba compara `Date.now()` do cliente com um timestamp
// gravado pelo Postgres (`matches.started_at`). Isso só funciona se os
// dois relógios baterem — e relógio de dispositivo real desalinha por
// motivos comuns (fuso mal configurado, VM sem NTP, relógio manual).
// Descoberto testando neste próprio ambiente sandboxed, onde o
// relógio local divergia dezenas de segundos do servidor.
//
// Primeira tentativa foi ler o header HTTP `Date` da resposta do
// PostgREST — não funciona: o browser não expõe esse header em
// respostas cross-origin por padrão (não está na lista de "simple
// response headers" do CORS, e o Supabase não configura
// Access-Control-Expose-Headers pra ele). RPC evita o problema porque
// o horário vem no CORPO da resposta, que o CORS sempre libera.
let offsetMs = 0;

export async function syncServerClock(): Promise<number> {
  const supabase = getBrowserClient();

  const t0 = Date.now();
  const { data, error } = await supabase.rpc("server_time_ms");
  const t1 = Date.now();

  if (error || data == null) return offsetMs;

  // Assume que a resposta chegou na metade da viagem de ida e volta —
  // aproximação padrão estilo NTP, suficiente pra um cronômetro em
  // segundos, não pra nada que precise de milissegundos de verdade.
  const roundTrip = t1 - t0;
  const estimatedLocalAtServerResponse = t0 + roundTrip / 2;

  offsetMs = data - estimatedLocalAtServerResponse;
  return offsetMs;
}

/** `Date.now()` corrigido pelo offset medido. Use isto, nunca `Date.now()` puro, em qualquer cálculo de tempo da bomba. */
export function serverNow(): number {
  return Date.now() + offsetMs;
}
