"use client";

import { useEffect } from "react";
import { ToyButton } from "@/components/ui/ToyButton";
import type { UseVoiceResult } from "@/lib/net/useVoice";
import type { VoiceRole } from "@/lib/net/voiceMesh";

/**
 * A barra de voz.
 *
 * Ela mostra o que o jogador PODE fazer, não um mixer. Metade dos
 * papéis tem a voz amputada por regra, e a interface precisa dizer
 * isso de cara — senão o Mudo passa a partida inteira gritando num
 * microfone desligado, achando que é bug, e o Surdo pede para
 * repetirem.
 */

const ROLE_ICON: Record<VoiceRole, string> = {
  cego: "🙈",
  surdo: "🙉",
  mudo: "🙊",
  espectador: "👀",
};

const ROLE_NAME: Record<VoiceRole, string> = {
  cego: "Cego",
  surdo: "Surdo",
  mudo: "Mudo",
  espectador: "Espectador",
};

/** Segura para falar, quando o microfone está no mudo. */
const PTT_KEY = "v";

export function VoiceBar({ voice }: { voice: UseVoiceResult }) {
  const { policy, micState, transmitting, level, speaking, setTransmitting } = voice;
  const live = micState === "on";

  // Push-to-talk: só faz sentido enquanto o microfone existe e está
  // no mudo. Soltar a tecla devolve ao mudo, nunca ao contrário — a
  // tecla não pode DEIXAR o microfone aberto por acidente.
  useEffect(() => {
    if (!live || transmitting) return;

    function isTyping(target: EventTarget | null) {
      const el = target as HTMLElement | null;
      return Boolean(el?.isContentEditable) || /^(INPUT|TEXTAREA|SELECT)$/.test(el?.tagName ?? "");
    }
    function down(event: KeyboardEvent) {
      if (event.repeat || event.key.toLowerCase() !== PTT_KEY || isTyping(event.target)) return;
      setTransmitting(true);
    }
    function up(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== PTT_KEY) return;
      setTransmitting(false);
    }
    // A janela perdendo o foco com a tecla presa deixaria o microfone
    // aberto para sempre — o clássico "hot mic".
    function blur() {
      setTransmitting(false);
    }

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [live, transmitting, setTransmitting]);

  return (
    <div className="pointer-events-auto flex flex-col items-start gap-1.5">
      {/* Quem eu ouço falando agora. Nunca aparece para o Surdo: a
          lista chega vazia porque o motor não a monta para ele. */}
      {speaking.length > 0 && (
        <div className="flex gap-1.5">
          {speaking.map((role) => (
            <span
              key={role}
              className="flex animate-pulse items-center gap-1 rounded-full border-2 border-outline bg-cream px-2 py-0.5 text-xs font-semibold text-outline shadow-[0_2px_0_0_var(--outline)]"
            >
              <span aria-hidden>{ROLE_ICON[role]}</span>
              {ROLE_NAME[role]} fala
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <MicControl voice={voice} />

        {!policy.canSpeak && (
          <Tag icon="🤐" text="você não fala — gesticule" />
        )}
        {!policy.canHear && <Tag icon="🔇" text="você não ouve ninguém" />}
      </div>

      {live && (
        <div className="flex items-center gap-2">
          <Meter level={transmitting ? level : 0} muted={!transmitting} />
          <span className="font-mono text-[10px] text-cream-dim/70">
            {transmitting ? "no ar" : "segure V para falar"}
          </span>
        </div>
      )}

      {voice.error && (
        <p className="max-w-[16rem] rounded-lg border border-alerta/60 bg-van-deep/80 px-2 py-1 text-[11px] text-alerta">
          {voice.error}
        </p>
      )}
    </div>
  );
}

function MicControl({ voice }: { voice: UseVoiceResult }) {
  const { policy, micState, transmitting, enableMic, disableMic, setTransmitting } = voice;

  if (!policy.canSpeak) return null;

  if (micState === "unsupported") {
    return <Tag icon="🚫" text="voz indisponível neste navegador" />;
  }

  if (micState !== "on") {
    return (
      <ToyButton
        size="sm"
        variant="circuito"
        onClick={enableMic}
        disabled={micState === "requesting"}
      >
        {micState === "requesting"
          ? "pedindo microfone..."
          : micState === "denied"
            ? "🎙️ tentar de novo"
            : "🎙️ Ligar voz"}
      </ToyButton>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <ToyButton
        size="sm"
        variant={transmitting ? "alerta" : "cream"}
        onClick={() => setTransmitting(!transmitting)}
        aria-pressed={transmitting}
      >
        {transmitting ? "🎙️ Aberto" : "🔇 Mudo"}
      </ToyButton>
      <button
        onClick={disableMic}
        title="Desligar o microfone"
        aria-label="Desligar o microfone"
        className="rounded-lg border border-outline/60 px-1.5 py-1 font-mono text-[10px] text-cream-dim/70 transition-colors hover:text-cream"
      >
        ✕
      </button>
    </div>
  );
}

/** Nível do próprio microfone. Existe para responder "ele está me ouvindo?". */
function Meter({ level, muted }: { level: number; muted: boolean }) {
  const bars = 5;
  const lit = Math.round(level * bars);
  return (
    <div className="flex items-end gap-0.5" aria-hidden>
      {Array.from({ length: bars }, (_, i) => (
        <span
          key={i}
          className={[
            "w-1 rounded-sm border border-outline/70 transition-colors duration-75",
            i < lit && !muted ? "bg-circuito" : "bg-van-deep/60",
          ].join(" ")}
          style={{ height: `${6 + i * 2.5}px` }}
        />
      ))}
    </div>
  );
}

function Tag({ icon, text }: { icon: string; text: string }) {
  return (
    <span className="flex items-center gap-1 rounded-lg border border-outline/60 bg-van-deep/70 px-2 py-1 font-mono text-[10px] text-cream-dim">
      <span aria-hidden>{icon}</span>
      {text}
    </span>
  );
}
