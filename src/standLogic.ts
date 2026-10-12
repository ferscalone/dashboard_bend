import type { Command, CyclePhase, StandState } from "./types";

// ── Управление: START / STOP / HOMING как независимые действия ────────────────
// Firmware API: три явные команды (NetworkManager::onCommand):
//
//   start : IDLE            → RUNNING (прогон циклов)   (иначе игнорируется)
//   stop  : RUNNING         → RETURN_HOME → IDLE        (иначе игнорируется)
//   home  : RUNNING         → эквивалент stop (возврат в центр)
//           ERROR/IDLE      → повторный homing          (идемпотентно из IDLE)
//
// Подпись кнопки - реальный токен прошивки (START / STOP / HOMING); русское
// пояснение располагается рядом отдельной меткой.

export interface Availability {
  enabled: boolean;
  command: Command | null;
  /** Токен, показываемый НА кнопке. */
  token: string;
  /** Русское пояснение рядом с кнопкой. */
  gloss: string;
  /** Почему кнопка отключена (заменяет строку пояснения при блокировке). */
  reason: string;
}

/** Доступность управления "START" (запуск прогона циклов). */
export function startAvailability(state: StandState | null): Availability {
  const base = { token: "START", gloss: "Запуск программы циклов" };
  switch (state) {
    case "IDLE":
      return { ...base, enabled: true, command: "start", reason: "" };
    case "RUNNING":
      return { ...base, enabled: false, command: null, reason: "Прогон уже идёт" };
    case "HOMING":
    case "RETURN_HOME":
      return { ...base, enabled: false, command: null, reason: "Идёт движение - дождитесь завершения" };
    case "ERROR":
      return { ...base, enabled: false, command: null, reason: "Сначала восстановление (HOMING)" };
    case "BOOT":
      return { ...base, enabled: false, command: null, reason: "Стенд инициализируется" };
    default:
      return { ...base, enabled: false, command: null, reason: "Нет связи со стендом" };
  }
}

/** Доступность управления "STOP" (прервать прогон -> возврат в центр). */
export function stopAvailability(state: StandState | null): Availability {
  const base = { token: "STOP", gloss: "Остановить и вернуться в центр" };
  switch (state) {
    case "RUNNING":
      return { ...base, enabled: true, command: "stop", reason: "" };
    default:
      return { ...base, enabled: false, command: null, reason: "Доступно только во время прогона" };
  }
}

/**
 * Доступность управления "HOMING / RETURN_HOME". Команда `home` запускает homing из
 * ERROR (восстановление) и из IDLE (идемпотентный homing); из RUNNING действует как
 * STOP (возврат в центр).
 */
export function homingAvailability(state: StandState | null): Availability {
  switch (state) {
    case "ERROR":
      return { enabled: true, command: "home", token: "HOMING", gloss: "Восстановление из аварии", reason: "" };
    case "IDLE":
      return { enabled: true, command: "home", token: "HOMING", gloss: "Возврат в центр (90°)", reason: "" };
    case "RUNNING":
      return { enabled: true, command: "home", token: "RETURN_HOME", gloss: "Прервать и вернуться в центр", reason: "" };
    case "HOMING":
    case "RETURN_HOME":
      return { enabled: false, command: null, token: "HOMING", gloss: "Возврат в центр (90°)", reason: "Homing уже выполняется" };
    case "BOOT":
      return { enabled: false, command: null, token: "HOMING", gloss: "Возврат в центр (90°)", reason: "Стенд инициализируется" };
    default:
      return { enabled: false, command: null, token: "HOMING", gloss: "Возврат в центр (90°)", reason: "Нет связи со стендом" };
  }
}

// ── Метаданные состояния для карточки статуса ────────────────────────────────
export interface StateMeta {
  label: string;
  intent: "idle" | "moving" | "homing" | "running" | "error" | "boot";
}

export function stateMeta(state: StandState | null): StateMeta {
  switch (state) {
    case "IDLE":
      return { label: "Ожидание", intent: "idle" };
    case "RUNNING":
      return { label: "Прогон циклов", intent: "running" };
    case "HOMING":
      return { label: "Homing", intent: "homing" };
    case "RETURN_HOME":
      return { label: "Возврат в центр", intent: "moving" };
    case "ERROR":
      return { label: "Авария", intent: "error" };
    case "BOOT":
      return { label: "Загрузка", intent: "boot" };
    default:
      return { label: "Нет связи", intent: "idle" };
  }
}

// ── Метка под-фазы прогона ───────────────────────────────────────────────────
export function phaseLabel(phase: CyclePhase | null | undefined): string {
  switch (phase) {
    case "ENTER_LEFT":
      return "Вход: → 0°";
    case "DWELL_LEFT":
      return "Выдержка в 0°";
    case "TO_RIGHT":
      return "Поворот 0° → 180°";
    case "DWELL_RIGHT":
      return "Выдержка в 180°";
    case "TO_LEFT":
      return "Поворот 180° → 0°";
    case "TO_CENTER":
      return "Возврат → 90°";
    case "IDLE":
    default:
      return "—";
  }
}
