// Формы JSON, отправляемые прошивкой. Зеркалирует Telemetry.cpp:
//   buildTelemetryJson()  → Telemetry
//   buildEventJson()      → StandEvent
// Имена/типы полей в точности соответствуют тому, что шлёт устройство; не
// переименовывать их.

/** Машина состояний прошивки (SystemState.h). */
export type StandState =
  | "BOOT"
  | "HOMING"
  | "IDLE"
  | "RUNNING"
  | "RETURN_HOME"
  | "ERROR";

/** Под-фаза прогона циклов (CyclePhase в .ino). */
export type CyclePhase =
  | "IDLE"
  | "ENTER_LEFT"
  | "DWELL_LEFT"
  | "TO_RIGHT"
  | "DWELL_RIGHT"
  | "TO_LEFT"
  | "TO_CENTER";

/** Периодический кадр телеметрии (~5 Гц по WS; также GET /v1/status). */
export interface Telemetry {
  state: StandState;
  phase: CyclePhase;
  // Угол в bend-кадре: 0 = крайнее левое, 90 = центр/покой (верх), 180 = крайнее правое.
  bend_angle_deg: number;
  encoder_abs_deg: number;
  encoder_rel_deg: number;
  encoder_fault: number; // 0 | 1
  cycles_done: number;
  cycles_target: number;
  // Действующий runtime-конфиг программы циклов.
  cfg_cycles: number;
  cfg_dwell_ms: number;
  cfg_speed_us: number;
  cfg_amplitude_deg: number;
  uptime_ms: number;
}

/** Кадр мгновенного дискретного события (смена состояния / цикл / завершение / ошибка / ack команды). */
export interface StandEvent {
  // Прошивка шлёт только эти события; смена под-фазы видна в телеметрии (phase).
  event: "state" | "cycle" | "done" | "error" | "ack";
  // Для "ack": "<CMD>:ok" или "<CMD>:ignored_<STATE>" (см. onCommand прошивки).
  // Для "cycle": "<done>/<target>". Для "done": "completed".
  detail: string;
  uptime_ms: number;
}

/** Тело ответа для POST /v1/config. */
export interface ConfigApplyResponse {
  applied?: { cycles: number; dwell_ms: number; speed_us: number; amplitude_deg: number };
  error?: string;
  detail?: string;
}

/** Текстовые кадры команд, понимаемые прошивкой. */
export type Command = "start" | "stop" | "home";

/** Жизненный цикл WebSocket-соединения для индикатора в шапке. */
export type ConnStatus = "connected" | "reconnecting" | "disconnected";

/** Одна выборочная точка для графика угла по времени. */
export interface AnglePoint {
  t: number;   // секунды по часам клиента (ось X uPlot)
  deg: number; // bend-угол
}

export function isTelemetry(m: unknown): m is Telemetry {
  return (
    typeof m === "object" &&
    m !== null &&
    "state" in m &&
    "bend_angle_deg" in m
  );
}

export function isEvent(m: unknown): m is StandEvent {
  return typeof m === "object" && m !== null && "event" in m;
}
