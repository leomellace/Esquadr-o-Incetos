// Slots de cor do jogo.
//
// Regra do projeto: cor nunca viaja sozinha. Cada slot carrega um
// glifo e um nome falado, e os três são emitidos juntos.
//
// Isso começou como acessibilidade (daltonismo), mas virou mecânica:
// o Surdo precisa DESCREVER a cor por voz para o Cego, que não vê
// cor nenhuma. "Aperta o triângulo" é uma frase que funciona; "aperta
// o vermelho" depende do Surdo e do Cego terem a mesma noção de
// vermelho — e o Cego não tem noção nenhuma. O glifo é o vocabulário
// compartilhado do trio, não um enfeite de acessibilidade.

export const PLAY_COLORS = ["banana", "alerta", "circuito", "cabo", "fio"] as const;

export type PlayColor = (typeof PLAY_COLORS)[number];

export interface PlayColorSpec {
  /** Classe utilitária Tailwind gerada pelos tokens em globals.css. */
  token: PlayColor;
  /** Glifo redundante. Precisa ser distinguível em silhueta pequena. */
  glyph: string;
  /** Como o trio fala essa cor em voz alta. */
  spoken: string;
  /** Nome curto para rótulos de UI. */
  label: string;
}

export const PLAY_COLOR_SPECS: Record<PlayColor, PlayColorSpec> = {
  banana: {
    token: "banana",
    glyph: "●",
    spoken: "círculo",
    label: "Banana",
  },
  alerta: {
    token: "alerta",
    glyph: "▲",
    spoken: "triângulo",
    label: "Alerta",
  },
  circuito: {
    token: "circuito",
    glyph: "■",
    spoken: "quadrado",
    label: "Circuito",
  },
  cabo: {
    token: "cabo",
    glyph: "◆",
    spoken: "losango",
    label: "Cabo",
  },
  fio: {
    token: "fio",
    glyph: "✚",
    spoken: "cruz",
    label: "Fio",
  },
};

export const CVD_MODES = ["none", "protan_deutan", "tritan"] as const;
export type CvdMode = (typeof CVD_MODES)[number];

export const CVD_LABELS: Record<CvdMode, string> = {
  none: "Padrão",
  protan_deutan: "Protanopia / Deuteranopia",
  tritan: "Tritanopia",
};
