import { describe, expect, it } from "vitest";
import { directionFor, voicePolicy, type VoiceRole } from "@/lib/net/voiceMesh";

/**
 * A amputação da conversa é a regra central do jogo, e ela mora no SDP
 * — não numa checagem de UI que alguém pode remover sem perceber. Estes
 * testes existem para que mexer em `voicePolicy` sem querer, um dia,
 * quebre o build em vez de quebrar o jogo silenciosamente.
 */

const ROLES: VoiceRole[] = ["cego", "surdo", "mudo"];

function direction(mine: VoiceRole, theirs: VoiceRole) {
  return directionFor(voicePolicy(mine), voicePolicy(theirs));
}

describe("política de voz por papel", () => {
  it("dá ao Cego ouvido e voz", () => {
    expect(voicePolicy("cego")).toEqual({ canSpeak: true, canHear: true });
  });

  it("tira o ouvido do Surdo e a voz do Mudo", () => {
    expect(voicePolicy("surdo")).toEqual({ canSpeak: true, canHear: false });
    expect(voicePolicy("mudo")).toEqual({ canSpeak: false, canHear: true });
  });
});

describe("direção da mídia", () => {
  it("nunca entrega áudio ao Surdo", () => {
    for (const other of ROLES) {
      expect(direction("surdo", other)).not.toContain("recv");
      // E o outro lado também não tenta mandar.
      expect(direction(other, "surdo")).not.toContain("send");
    }
  });

  it("nunca deixa o Mudo transmitir", () => {
    for (const other of ROLES) {
      expect(direction("mudo", other)).not.toContain("send");
      expect(direction(other, "mudo")).not.toContain("recv");
    }
  });

  it("fecha o ciclo Surdo → Cego → Mudo", () => {
    expect(direction("surdo", "cego")).toBe("sendonly");
    expect(direction("cego", "surdo")).toBe("recvonly");

    expect(direction("cego", "mudo")).toBe("sendonly");
    expect(direction("mudo", "cego")).toBe("recvonly");

    expect(direction("surdo", "mudo")).toBe("sendonly");
    expect(direction("mudo", "surdo")).toBe("recvonly");
  });

  it("não abre conexão entre dois papéis sem nada a trocar", () => {
    // Dois Mudos não têm o que se dizer; dois espectadores também não.
    expect(direction("mudo", "mudo")).toBe("inactive");
    expect(direction("espectador", "espectador")).toBe("inactive");
  });

  it("é simétrica: o que um manda é o que o outro recebe", () => {
    const opposite: Record<string, string> = {
      sendonly: "recvonly",
      recvonly: "sendonly",
      sendrecv: "sendrecv",
      inactive: "inactive",
    };
    for (const a of ROLES) {
      for (const b of ROLES) {
        if (a === b) continue;
        expect(direction(b, a)).toBe(opposite[direction(a, b)]);
      }
    }
  });
});
