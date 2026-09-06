// Alfabeto sem O/I: se confundem com 0/1 quando um jogador dita o
// código em voz alta para os outros dois entrarem na sala.
// Compatível com o CHECK ^[A-Z2-9]{6}$ da migration (subconjunto seguro).
const SAFE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += SAFE_ALPHABET[Math.floor(Math.random() * SAFE_ALPHABET.length)];
  }
  return code;
}

export function normalizeRoomCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z2-9]/g, "");
}
