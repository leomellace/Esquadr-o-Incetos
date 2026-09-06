// Nome sugerido para o perfil anônimo. O jogador pode trocar depois;
// isso só evita jogar alguém numa tela de cadastro antes de ver o jogo.
const ADJECTIVES = [
  "Veloz",
  "Sortudo",
  "Nervoso",
  "Silencioso",
  "Esperto",
  "Corajoso",
  "Distraído",
  "Ligeiro",
];

const AVATARS = ["macaco-01", "macaco-02", "macaco-03", "macaco-04", "macaco-05"] as const;

export function suggestDisplayName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const num = Math.floor(10 + Math.random() * 90);
  return `Macaco${adj}${num}`;
}

export function suggestAvatarKey(): string {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)];
}
