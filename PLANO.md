# Esquadrão InCetos — Plano de Desenvolvimento

Jogo multiplayer cooperativo para exatamente 3 jogadores, web, com assimetria de informação.
Inspirado nas mecânicas de BOMBANANA! — **toda arte, texto, manual, nomes e áudio serão originais**.
As imagens de referência servem apenas como direção de "vibe" (plástico de brinquedo, cores saturadas, humor).

## Decisões travadas

| Decisão | Escolha |
|---|---|
| Motor visual | React Three Fiber (3D real) |
| Chat de voz | WebRTC integrado na v1 |
| Ordem de entrega | Base completa primeiro |
| Plataformas | Desktop + mobile responsivo |

## Stack

- **Next.js 15** (App Router) + React 19 + TypeScript strict
- **Tailwind CSS v4** + design tokens em CSS custom properties
- **React Three Fiber** + `@react-three/drei` + `@react-three/postprocessing`
- **Zustand** para estado de cliente; **Immer** para reducers de módulo
- **Supabase**: Auth (anônima + e-mail opcional), Postgres, Realtime (Broadcast + Presence), Edge Functions
- **Vercel**: hosting, Route Handlers, preview deploys por branch
- **Howler/Tone.js** para SFX e mixagem por papel
- **Vitest** (lógica de módulos, PRNG, reducers) + **Playwright** (fluxo de sala com 3 contextos)

## Arquitetura de rede

**Host-authoritative.** Vercel é serverless e não sustenta um loop de jogo; Supabase Realtime é o transporte.

- O criador da sala é o *host*. Roda o tick de lógica a 20 Hz e transmite deltas a 10 Hz.
- Canal `room:{code}` (Broadcast + Presence).
- A bomba é gerada por **seed determinístico** (`mulberry32`): cliente e servidor reconstroem a mesma bomba. O manual do Mudo e a solução real são sempre coerentes por construção.
- Cada partida grava um **action log**. Ao terminar, uma Edge Function reexecuta o seed + log e valida o resultado antes de gravar progressão — impede progresso forjado sem precisar de servidor autoritativo.
- **Migração de host**: se o host cai, o peer de menor id assume a partir do último snapshot (snapshot completo a cada 2 s e em todo join).

### Protocolo (tipado, discriminated union)

| Mensagem | Direção | Conteúdo |
|---|---|---|
| `state:snapshot` | host → todos | estado completo da bomba |
| `state:delta` | host → todos | timer, strikes, módulos alterados |
| `input:action` | cliente → host | pressionar, cortar, girar |
| `comms:*` | cliente → todos | gesto, apontar, emote, estapear |
| `rtc:*` | cliente → cliente | offer / answer / ICE |

## Modelo de dados (Postgres + RLS)

- `profiles` — display_name, avatar, `cvd_mode`, preferências
- `rooms` — code (6 letras), host_id, mode (campaign/endless/custom), status, config jsonb, seed
- `room_members` — role (cego/mudo/surdo), ready — **unique(room_id, role)** garante um papel por jogador
- `matches` — level_id, seed, result, strikes, time_left_ms
- `match_events` — action log para validação e replay
- `campaign_levels` — 30 fases autorais (módulos, ameaças, tempo, limite de erros)
- `progress` / `unlocks` — melhor tempo, estrelas, desbloqueios

RLS em todas as tabelas; acesso a sala via função `security definer` que checa membership.

## Os três papéis — o coração do jogo

O ciclo de comunicação precisa ser **fechado e forçado**:

- 🙈 **Cego** — única visão: wireframe branco sobre preto, **sem cor e sem texto legível** (glifos embaralhados). É o **único que pode interagir** com a bomba. Ouve tudo, inclusive os módulos de áudio.
- 🙊 **Mudo** — único que **lê o manual**. Microfone desativado por regra do jogo. Só se comunica por gestos, apontar e emotes.
- 🙉 **Surdo** — vê a bomba inteira em 3D com cores e telas. **Não recebe áudio nenhum** (nem voz, nem SFX). Pode falar.

Resultado: o Mudo lê → gesticula → só o Surdo vê → fala → só o Cego ouve → só o Cego age → só o Surdo vê o resultado. Ninguém resolve nada sozinho.

## Módulos — SDK

```ts
interface ModuleDef<S, Sol> {
  id: string
  generate(rng: RNG, difficulty: number): { state: S; solution: Sol; manual: ManualData }
  reduce(state: S, action: Action): { state: S; result: 'progress' | 'solved' | 'strike' | 'noop' }
  Sighted: FC<{ state: S }>   // Surdo — cena 3D com cor
  Blind:   FC<{ state: S }>   // Cego — wireframe sem cor nem texto
  Manual:  FC<{ manual: ManualData }>  // Mudo — páginas do manual
  audio?:  (state: S) => SfxCue[]      // só o Cego escuta
}
```

**Seis módulos na v1**, cada um estressando um canal diferente:

1. **Cabos** — cortar por contagem + cor da luz ativa
2. **Simon** — sequência de botões coloridos, mapeamento no manual
3. **Teclado de símbolos** — ordenar glifos esotéricos
4. **Interruptores** — combinação binária
5. **Rádio/Morse** — *só o Cego ouve*, Mudo decodifica, Surdo confere a tela → inverte a hierarquia
6. **Roda de bananas** — rotação e direção, feedback tátil de "cliques" para o Cego

## Ameaças

`blackout` (escurece o Surdo) · `estática` (distorce o áudio do Cego) · `fumaça` (obstrui a cena) · `manual embaralhado` (reordena as páginas do Mudo) · `grito` (pico de volume, com limitador de segurança)

## Acessibilidade

- Três modos de cor: normal / protanopia-deuteranopia / tritanopia
- **Toda** codificação por cor tem redundância de forma (ícone, padrão, textura) — decidido na camada de tokens, não remendado depois
- Redução de movimento, legenda de SFX opcional, escala de fonte, contraste WCAG AA na UI

## Fases de execução

| # | Fase | Modelo | Entrega |
|---|---|---|---|
| F0 ✅ | Fundação | Sonnet 5 | Scaffold Next 15, lint, testes, Supabase local + remoto, migrations, deploy Vercel |
| F1 ✅ | Design System | **Opus 5** | Identidade visual, paleta, tipografia, tokens, componentes base, 3 variantes de daltonismo, linguagem de movimento |
| F2 ✅ | Auth + Lobby | Sonnet 5 | Auth anônima, perfil, sala por código, presença, seleção exclusiva de papel, ready-check |
| F3 ✅ | Netcode | Sonnet 5 | Canal realtime, protocolo tipado, loop host-authoritative, reconexão, migração de host |
| F4 ✅ | Motor de bomba | Sonnet 5 | PRNG determinístico, geração por seed, timer, strikes, vitória/derrota, validação na Edge Function |
| F5 ✅ | Cena 3D | **Opus 5** | Van + bomba em R3F, look plástico de brinquedo (outline, bloom, sombra macia), câmera por papel, orçamento de perf mobile |
| F6 ✅ | As 3 visões | **Opus 5** | Visão do Surdo, wireframe do Cego, manual folheável do Mudo |
| F7 | Voz WebRTC | Sonnet 5 | Mesh de 3 peers, sinalização via Broadcast, roteamento por papel, push-to-talk, TURN de fallback |
| F8 ✅ | Comunicação não-verbal | **Opus 5** | Roda de gestos, apontar compartilhado (raycast), emotes, estapear |
| F9 | Módulos 1–6 | Sonnet (lógica) + **Opus** (visual) | Seis módulos completos nas três visões |
| F10 | Modos de jogo | Sonnet 5 | Campanha (30 fases + curva), Infinito procedural, Personalizado |
| F11 | Ameaças + Áudio | **Opus 5** | Sistema de ameaças, trilha, SFX espacial, mixagem por papel |
| F12 | Polish | **Opus 5** | Telas de vitória/explosão, transições, tutorial, performance, playtest |

## Riscos e mitigações

- **WebRTC sem TURN falha em NAT simétrico** → provisionar TURN gratuito (Metered/Cloudflare) já em F7.
- **Limites do Supabase Realtime** (free: 200 conexões, 2 M msgs/mês) → deltas em vez de snapshots, teto de 10 Hz, coalescência de eventos de gesto.
- **R3F em mobile** → orçamento de draw calls, postprocessing desligado em telas pequenas, fallback de qualidade automático.
- **Host com lag prejudica todos** → mostrar ping de cada peer, permitir troca manual de host no lobby.
- **Testar um jogo de 3 pessoas é caro** → modo dev com 3 painéis na mesma tela desde F3.
