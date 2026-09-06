/**
 * Espessura dos contornos, em PIXELS de tela.
 *
 * Pegadinha do <Outlines> do drei: no modo padrão (`screenspace={false}`,
 * apesar do nome) o shader divide a espessura pelo tamanho do buffer,
 * então o valor está em pixels — não em unidades de mundo. Passar 0.014
 * ali, como se fosse metro, produz 1/70 de pixel: contorno nenhum.
 *
 * Pixel constante é, aliás, o que esse estilo pede: a linha não engrossa
 * quando a câmera aproxima, igual a um traço desenhado por cima.
 */
export const OUTLINE_PX = {
  /** Silhuetas grandes: maleta, tampa, móveis. */
  chassis: 4,
  /** Peças médias: cantoneiras, travas, módulos. */
  part: 3,
  /** Detalhes pequenos: visor, botões, adereços. */
  detail: 2,
} as const;
