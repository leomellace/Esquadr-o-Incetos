"use client";

import { getBrowserClient } from "@/lib/supabase/client";
import type { Role } from "@/types/database";

/**
 * Voz por WebRTC — malha de 3 pares, sinalização pelo Realtime.
 *
 * O ponto que faz esta camada existir não é técnico: é que o jogo é
 * sobre uma conversa AMPUTADA. Se todo mundo ouvisse todo mundo, os
 * papéis viravam fantasia. Então a limitação não é implementada no
 * botão de mutar (que o jogador desliga) nem no volume (que ele sobe):
 * é implementada na DIREÇÃO da mídia negociada.
 *
 * O Mudo nunca anexa faixa de microfone; o Surdo nunca recebe faixa
 * nenhuma. Com as três funções do jogo, todo par acaba unidirecional:
 *
 *     Surdo ──fala──▶ Cego ──fala──▶ Mudo
 *       └───────────fala───────────────┘
 *
 * e a resposta do Mudo volta por gesto, não por áudio (ver
 * `GestureWheel`). O ciclo fecha, e fecha porque o SDP diz que fecha —
 * o áudio do Cego literalmente não chega ao Surdo, não há o que vazar.
 *
 * Fora do React de propósito: negociação de WebRTC é uma máquina de
 * estados com callbacks de vida longa, e espremer isso em efeitos e
 * refs só produz re-render e regra de lint. Aqui é uma classe comum; o
 * React entra por `useSyncExternalStore` no hook `useVoice`.
 */

export type MicState = "off" | "requesting" | "on" | "denied" | "unsupported";

export type VoiceRole = Role | "espectador";

export interface VoiceSnapshot {
  micState: MicState;
  /** Meu microfone está transmitindo agora (mutado ≠ desligado). */
  transmitting: boolean;
  /** Nível do meu próprio microfone, 0–1. Prova de que ele funciona. */
  level: number;
  /**
   * Quem está falando agora, por PAPEL — não por nome.
   *
   * "o Surdo está falando" é acionável; "MacacoNervoso96 está falando"
   * obriga a lembrar quem é quem no meio de uma contagem regressiva.
   */
  speaking: VoiceRole[];
  /** Papéis com a conexão de áudio de fato estabelecida. */
  connected: VoiceRole[];
  error: string | null;
}

export interface VoicePolicy {
  canSpeak: boolean;
  canHear: boolean;
}

/** O que cada papel pode fazer com a voz. É a regra do jogo, não uma preferência. */
export function voicePolicy(role: Role | "espectador" | null): VoicePolicy {
  switch (role) {
    case "cego":
      return { canSpeak: true, canHear: true };
    case "surdo":
      return { canSpeak: true, canHear: false };
    case "mudo":
      return { canSpeak: false, canHear: true };
    default:
      // Espectador acompanha, não participa da conversa.
      return { canSpeak: false, canHear: true };
  }
}

/**
 * Direção da mídia entre dois papéis.
 *
 * Genérico de propósito: com os três papéis atuais o resultado é
 * sempre unidirecional, mas quem mexer nos papéis depois não precisa
 * lembrar disso — a tabela sai sozinha das duas permissões.
 */
export function directionFor(mine: VoicePolicy, theirs: VoicePolicy): RTCRtpTransceiverDirection {
  const send = mine.canSpeak && theirs.canHear;
  const recv = mine.canHear && theirs.canSpeak;
  if (send && recv) return "sendrecv";
  if (send) return "sendonly";
  if (recv) return "recvonly";
  return "inactive";
}

/**
 * STUN público resolve a maioria dos NATs domésticos. NAT simétrico
 * (comum em 4G/operadora e em rede corporativa) NÃO fura só com STUN e
 * precisa de TURN — por isso as variáveis são lidas aqui e a ausência
 * delas é degradação conhecida, não surpresa em produção.
 */
function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ];
  const turn = process.env.NEXT_PUBLIC_TURN_URL;
  if (turn) {
    servers.push({
      urls: turn,
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
    });
  }
  return servers;
}

export function hasTurn(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_TURN_URL);
}

type Signal =
  | { kind: "sdp"; to: string; from: string; description: RTCSessionDescriptionInit }
  | { kind: "ice"; to: string; from: string; candidate: RTCIceCandidateInit }
  | { kind: "voice"; from: string; speaking: boolean };

interface Link {
  pc: RTCPeerConnection;
  /** Padrão "perfect negotiation": o educado cede na colisão de ofertas. */
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  sender: RTCRtpSender | null;
  audio: HTMLAudioElement | null;
}

interface VoiceMeshOptions {
  roomId: string;
  selfProfileId: string;
  role: Role | "espectador" | null;
}

/** Acima disto conta como fala. Calibrado para voz normal, não para respiração. */
const SPEAKING_RMS = 0.045;
/** Segura o indicador aceso para ele não piscar entre sílabas. */
const SPEAKING_HOLD_MS = 350;

export class VoiceMesh {
  private readonly roomId: string;
  private readonly selfId: string;
  private readonly role: Role | "espectador" | null;
  private readonly policy: VoicePolicy;

  private channel: ReturnType<ReturnType<typeof getBrowserClient>["channel"]> | null = null;
  private links = new Map<string, Link>();
  private roles = new Map<string, VoiceRole>();
  private listeners = new Set<() => void>();

  private stream: MediaStream | null = null;
  private track: MediaStreamTrack | null = null;
  private audioCtx: AudioContext | null = null;
  private meterTimer: ReturnType<typeof setInterval> | null = null;
  private speakingSince = 0;
  private lastSentSpeaking = false;
  private remoteSpeaking = new Map<string, number>();

  private stopped = false;
  private snapshot: VoiceSnapshot = {
    micState: "off",
    transmitting: false,
    level: 0,
    speaking: [],
    connected: [],
    error: null,
  };

  constructor({ roomId, selfProfileId, role }: VoiceMeshOptions) {
    this.roomId = roomId;
    this.selfId = selfProfileId;
    this.role = role;
    this.policy = voicePolicy(role);
    if (typeof window !== "undefined" && !window.RTCPeerConnection) {
      this.snapshot = { ...this.snapshot, micState: "unsupported" };
    }
  }

  // ---------------------------------------------------------------- store

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): VoiceSnapshot => this.snapshot;

  private patch(next: Partial<VoiceSnapshot>) {
    this.snapshot = { ...this.snapshot, ...next };
    for (const listener of this.listeners) listener();
  }

  // ----------------------------------------------------------- ciclo de vida

  start() {
    if (this.channel) return;
    // Reversível de propósito: em StrictMode o React monta, desmonta e
    // monta de novo: se `stop()` deixasse a instância envenenada, a voz
    // simplesmente não subiria em desenvolvimento.
    this.stopped = false;
    const supabase = getBrowserClient();

    const channel = supabase.channel(`voice:${this.roomId}`, {
      config: { presence: { key: this.selfId }, broadcast: { self: false } },
    });
    this.channel = channel;

    channel
      .on("broadcast", { event: "signal" }, ({ payload }) => {
        void this.onSignal(payload as Signal);
      })
      .on("presence", { event: "sync" }, () => this.reconcile())
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // A presença carrega o papel porque a direção da mídia
          // depende dele: sem saber o que o outro pode ouvir, não dá
          // para montar o SDP.
          await channel.track({ role: this.role });
        }
      });
  }

  stop() {
    this.stopped = true;
    this.disableMic();
    for (const id of [...this.links.keys()]) this.dropLink(id);
    if (this.channel) {
      getBrowserClient().removeChannel(this.channel);
      this.channel = null;
    }
    // Os ouvintes NÃO são limpos aqui: quem assina é o
    // `useSyncExternalStore`, que cancela a própria assinatura. Limpar
    // por baixo dele deixaria a UI surda a um `start()` seguinte.
  }

  // -------------------------------------------------------------- microfone

  async enableMic(): Promise<void> {
    if (!this.policy.canSpeak) return;
    if (this.snapshot.micState === "on" || this.snapshot.micState === "requesting") return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      this.patch({ micState: "unsupported" });
      return;
    }

    this.patch({ micState: "requesting", error: null });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      if (this.stopped) {
        for (const t of stream.getTracks()) t.stop();
        return;
      }

      this.stream = stream;
      this.track = stream.getAudioTracks()[0] ?? null;
      this.startMeter(stream);

      // Entra nas conexões que já existem sem renegociar do zero:
      // `replaceTrack` num transceiver já negociado não dispara nova
      // oferta, então ligar o microfone no meio da partida não corta
      // o áudio de ninguém.
      for (const link of this.links.values()) {
        if (link.sender) await link.sender.replaceTrack(this.track);
      }

      this.patch({ micState: "on", transmitting: true });
    } catch (err) {
      const denied =
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "SecurityError");
      this.patch({
        micState: denied ? "denied" : "off",
        error: denied
          ? "Permissão de microfone negada — libere no cadeado da barra de endereço."
          : describe(err),
      });
    }
  }

  disableMic() {
    this.stopMeter();
    if (this.stream) {
      for (const t of this.stream.getTracks()) t.stop();
      this.stream = null;
      this.track = null;
    }
    for (const link of this.links.values()) void link.sender?.replaceTrack(null);
    this.sendSpeaking(false);
    if (!this.stopped) this.patch({ micState: "off", transmitting: false, level: 0 });
  }

  /** Mudo/PTT: a faixa continua negociada, só para de carregar áudio. */
  setTransmitting(on: boolean) {
    if (!this.track) return;
    this.track.enabled = on;
    if (!on) this.sendSpeaking(false);
    this.patch({ transmitting: on, level: on ? this.snapshot.level : 0 });
  }

  private startMeter(stream: MediaStream) {
    const Ctor =
      window.AudioContext ??
      (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;

    const ctx = new Ctor();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    // De propósito NÃO conectado ao destino: jogar o próprio microfone
    // na saída é o retorno que faz todo mundo tirar o fone.
    this.audioCtx = ctx;

    const buf = new Float32Array(analyser.fftSize);
    this.meterTimer = setInterval(() => {
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += v * v;
      const rms = Math.sqrt(sum / buf.length);

      const now = Date.now();
      if (rms > SPEAKING_RMS && this.track?.enabled === true) this.speakingSince = now;
      const speaking = now - this.speakingSince < SPEAKING_HOLD_MS;

      if (speaking !== this.lastSentSpeaking) {
        this.lastSentSpeaking = speaking;
        this.sendSpeaking(speaking);
      }
      this.pruneSpeaking();
      this.patch({ level: Math.min(1, rms * 8) });
    }, 100);
  }

  private stopMeter() {
    if (this.meterTimer) clearInterval(this.meterTimer);
    this.meterTimer = null;
    void this.audioCtx?.close();
    this.audioCtx = null;
    this.lastSentSpeaking = false;
  }

  private sendSpeaking(speaking: boolean) {
    const payload: Signal = { kind: "voice", from: this.selfId, speaking };
    this.channel?.send({ type: "broadcast", event: "signal", payload });
  }

  private pruneSpeaking() {
    const now = Date.now();
    let changed = false;
    for (const [id, until] of this.remoteSpeaking) {
      if (until < now) {
        this.remoteSpeaking.delete(id);
        changed = true;
      }
    }
    if (changed) this.patch({ speaking: this.speakingRoles() });
  }

  // ------------------------------------------------------------- negociação

  private reconcile() {
    const state = this.channel?.presenceState() ?? {};
    const present = new Set<string>();

    for (const [id, metas] of Object.entries(state)) {
      if (id === this.selfId) continue;
      const meta = (metas as Array<{ role?: string }>)[0];
      const role = (meta?.role ?? null) as Role | "espectador" | null;
      if (!role) continue;
      present.add(id);
      this.roles.set(id, role);
      if (!this.links.has(id)) this.openLink(id, role);
    }

    for (const id of [...this.links.keys()]) {
      if (!present.has(id)) this.dropLink(id);
    }
  }

  private openLink(peerId: string, peerRole: Role | "espectador") {
    const direction = directionFor(this.policy, voicePolicy(peerRole));
    // Nada a trocar com esse par: não abre conexão nenhuma. Um Mudo e
    // um Surdo juntos não têm o que se dizer por áudio.
    if (direction === "inactive") return;

    const pc = new RTCPeerConnection({ iceServers: iceServers() });
    // Quem tem o id menor faz a oferta; o outro é o "educado" e desfaz
    // a própria oferta se as duas cruzarem no ar. Determinístico dos
    // dois lados, sem ninguém combinar nada.
    const polite = this.selfId > peerId;
    const link: Link = {
      pc,
      polite,
      makingOffer: false,
      ignoreOffer: false,
      sender: null,
      audio: null,
    };
    this.links.set(peerId, link);

    const transceiver = pc.addTransceiver("audio", { direction });
    link.sender = direction === "recvonly" ? null : transceiver.sender;
    if (this.track && link.sender) void link.sender.replaceTrack(this.track);

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.emit({ kind: "ice", to: peerId, from: this.selfId, candidate: candidate.toJSON() });
      }
    };

    pc.ontrack = ({ streams }) => {
      if (!this.policy.canHear) return;
      const stream = streams[0];
      if (!stream) return;
      const audio = link.audio ?? new Audio();
      audio.autoplay = true;
      audio.srcObject = stream;
      // O clique em "Ligar microfone" é o gesto que autoriza o
      // autoplay; ainda assim o play() pode falhar, e falhar não pode
      // derrubar a conexão junto.
      void audio.play().catch(() => {});
      link.audio = audio;
    };

    // `addTransceiver` acima já dispara isto: é aqui que a oferta nasce,
    // e só no lado impolido — o educado espera.
    pc.onnegotiationneeded = async () => {
      if (polite) return;
      try {
        link.makingOffer = true;
        await pc.setLocalDescription();
        if (pc.localDescription) {
          this.emit({
            kind: "sdp",
            to: peerId,
            from: this.selfId,
            description: pc.localDescription.toJSON(),
          });
        }
      } catch (err) {
        this.patch({ error: describe(err) });
      } finally {
        link.makingOffer = false;
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") pc.restartIce();
      this.patch({ connected: this.connectedRoles() });
    };
  }

  private dropLink(peerId: string) {
    const link = this.links.get(peerId);
    if (!link) return;
    link.pc.onicecandidate = null;
    link.pc.ontrack = null;
    link.pc.onnegotiationneeded = null;
    link.pc.onconnectionstatechange = null;
    link.pc.close();
    if (link.audio) {
      link.audio.pause();
      link.audio.srcObject = null;
    }
    this.links.delete(peerId);
    this.roles.delete(peerId);
    this.remoteSpeaking.delete(peerId);
    if (!this.stopped) {
      this.patch({ connected: this.connectedRoles(), speaking: this.speakingRoles() });
    }
  }

  private connectedRoles(): VoiceRole[] {
    return [...this.links.entries()]
      .filter(([, link]) => link.pc.connectionState === "connected")
      .map(([id]) => this.roles.get(id))
      .filter((role): role is VoiceRole => Boolean(role))
      .sort();
  }

  private speakingRoles(): VoiceRole[] {
    return [...this.remoteSpeaking.keys()]
      .map((id) => this.roles.get(id))
      .filter((role): role is VoiceRole => Boolean(role))
      .sort();
  }

  private emit(signal: Signal) {
    this.channel?.send({ type: "broadcast", event: "signal", payload: signal });
  }

  private async onSignal(signal: Signal) {
    if (signal.kind === "voice") {
      // Quem não ouve também não vê quem está falando: mostrar isso ao
      // Surdo devolveria pela interface a informação que o papel tira.
      if (!this.policy.canHear || signal.from === this.selfId) return;
      if (signal.speaking) {
        this.remoteSpeaking.set(signal.from, Date.now() + 1500);
      } else {
        this.remoteSpeaking.delete(signal.from);
      }
      this.patch({ speaking: this.speakingRoles() });
      return;
    }

    if (signal.to !== this.selfId) return;
    const link = this.links.get(signal.from);
    if (!link) return;
    const { pc, polite } = link;

    try {
      if (signal.kind === "ice") {
        try {
          await pc.addIceCandidate(signal.candidate);
        } catch (err) {
          // Candidato que chega depois de uma oferta ignorada é lixo
          // esperado, não erro — só propaga se a oferta valia.
          if (!link.ignoreOffer) throw err;
        }
        return;
      }

      const offerCollision =
        signal.description.type === "offer" &&
        (link.makingOffer || pc.signalingState !== "stable");
      link.ignoreOffer = !polite && offerCollision;
      if (link.ignoreOffer) return;

      await pc.setRemoteDescription(signal.description);
      if (signal.description.type === "offer") {
        await pc.setLocalDescription();
        if (pc.localDescription) {
          this.emit({
            kind: "sdp",
            to: signal.from,
            from: this.selfId,
            description: pc.localDescription.toJSON(),
          });
        }
      }
    } catch (err) {
      this.patch({ error: describe(err) });
    }
  }
}

function describe(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err && "message" in err) return String(err.message);
  return "Falha na conexão de voz.";
}
