/**
 * O vocabulário do Mudo.
 *
 * Ele é escolhido pelo que a corrente de comunicação precisa carregar,
 * não por ser simpático. O Mudo lê a regra e não pode falar; tudo que
 * ele conseguir dizer tem que caber aqui.
 *
 * Daí a presença dos números: numa sequência, "qual posição" é a
 * informação mais densa que ele precisa passar, e apontar sozinho não
 * distingue "esse agora" de "esse é o terceiro". Sim/não/espera cobrem
 * a confirmação, e a dúvida existe para ele poder dizer que a
 * descrição do outro não bateu com o manual.
 */
export const GESTURES = [
  { id: "sim", label: "Sim", icon: "👍" },
  { id: "nao", label: "Não", icon: "👎" },
  { id: "espera", label: "Espera", icon: "✋" },
  { id: "duvida", label: "Não entendi", icon: "❓" },
  { id: "um", label: "Um", icon: "1️⃣" },
  { id: "dois", label: "Dois", icon: "2️⃣" },
  { id: "tres", label: "Três", icon: "3️⃣" },
  { id: "quatro", label: "Quatro", icon: "4️⃣" },
] as const;

export type GestureId = (typeof GESTURES)[number]["id"];

/** Extra fora da roda — o jogo pede, e ninguém precisa de submenu para dar um tapa. */
export const SLAP = { id: "tapa" as const, label: "Estapear", icon: "🖐️" };

export type SignalKind = GestureId | typeof SLAP.id;

const BY_ID = new Map<string, { id: string; label: string; icon: string }>(
  [...GESTURES, SLAP].map((g) => [g.id, g]),
);

export function gestureIcon(id: string): string {
  return BY_ID.get(id)?.icon ?? "❔";
}

export function gestureLabel(id: string): string {
  return BY_ID.get(id)?.label ?? id;
}

/** Quanto tempo um gesto fica no ar antes de sumir. */
export const GESTURE_TTL_MS = 2600;
