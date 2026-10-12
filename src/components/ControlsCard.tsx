import type { ReactNode } from "react";
import type { Command, StandState } from "../types";
import {
  homingAvailability,
  startAvailability,
  stopAvailability,
  type Availability,
} from "../standLogic";
import type { Gate } from "../coord/useCoordinator";
import { gated, LockedIcon, LockTag } from "./LockTag";

interface Props {
  state: StandState | null;
  onCommand: (cmd: Command) => void;
  /** Право управления (канал). Без права кнопки заблокированы с пояснением, кто управляет. */
  gate: Gate;
}

const StartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 4l14 8-14 8V4z" />
  </svg>
);
const StopIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="6" width="12" height="12" rx="1.5" />
  </svg>
);
const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 11l9-7 9 7" />
    <path d="M5 10v9h14v-9" />
  </svg>
);

/**
 * Три независимых элемента управления: START (запуск прогона циклов), STOP
 * (прервать -> возврат в центр) и HOMING (восстановление / возврат в центр).
 * Подпись кнопки - реальный токен прошивки (START / STOP / HOMING / RETURN_HOME);
 * рядом располагается русская расшифровка или причина блокировки.
 */
export function ControlsCard({ state, onCommand, gate }: Props) {
  const start = gated(startAvailability(state), gate);
  const stop = gated(stopAvailability(state), gate);
  const homing = gated(homingAvailability(state), gate);
  const locked = !gate.allowed;

  return (
    <section className="card col-5 controls-card">
      <div className="title">
        <h2>Управление</h2>
        <LockTag gate={gate} />
      </div>
      <div className="controls">
        <ControlRow avail={start} icon={locked ? <LockedIcon /> : <StartIcon />} onClick={() => start.command && onCommand(start.command)} />
        <ControlRow avail={stop} icon={locked ? <LockedIcon /> : <StopIcon />} secondary onClick={() => stop.command && onCommand(stop.command)} />
        <ControlRow avail={homing} icon={locked ? <LockedIcon /> : <HomeIcon />} secondary onClick={() => homing.command && onCommand(homing.command)} />
      </div>
    </section>
  );
}

function ControlRow({
  avail,
  icon,
  secondary,
  onClick,
}: {
  avail: Availability;
  icon: ReactNode;
  secondary?: boolean;
  onClick: () => void;
}) {
  return (
    <div className="control">
      <button
        className={`ctl-btn ${secondary ? "secondary" : ""}`}
        disabled={!avail.enabled}
        onClick={onClick}
        title={avail.enabled ? avail.gloss : avail.reason}
      >
        {icon}
        {avail.token}
      </button>
      <div className="ctl-meta">
        <div className="name">{avail.gloss}</div>
        <div className="why">
          {avail.enabled ? "Готово" : avail.reason}
        </div>
      </div>
    </div>
  );
}
