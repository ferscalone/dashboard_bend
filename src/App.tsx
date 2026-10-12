import { useCallback, useEffect, useRef, useState } from "react";
import { clearStoredHost, defaultHost, resolveHost, setStoredHost } from "./config";
import { useStand, type LogEntry } from "./hooks/useStand";
import { useTheme } from "./hooks/useTheme";
import { useCoordinator } from "./coord/useCoordinator";
import type { Command } from "./types";
import { Header } from "./components/Header";
import { LockBar } from "./components/LockBar";
import { Toasts } from "./components/Toasts";
import { LogArchive } from "./components/LogArchive";
import { ControlsCard } from "./components/ControlsCard";
import { StatusCard } from "./components/StatusCard";
import { AngleDial } from "./components/AngleDial";
import { CycleCard } from "./components/CycleCard";
import { CycleConfigCard } from "./components/CycleConfigCard";
import { AngleChart } from "./components/AngleChart";
import { EventLog } from "./components/EventLog";

export default function App() {
  const { theme, toggle } = useTheme();
  const [host, setHost] = useState<string>(() => resolveHost());
  const [archiveOpen, setArchiveOpen] = useState(false);

  // Канал управления + серверный журнал. Записи общего журнала (кто что сделал)
  // попадают в экранный журнал через noteRef - useStand создаётся ниже.
  const noteRef = useRef<(kind: LogEntry["kind"], text: string) => void>(() => {});
  const coord = useCoordinator(host, (kind, text) => noteRef.current(kind, text));
  const { status, telemetry, history, log, send, sendConfig, note } = useStand(host, coord.observer);
  noteRef.current = note;

  const applyHost = useCallback((next: string) => {
    const h = next.trim();
    if (!h) return;
    setStoredHost(h);
    setHost(h);
  }, []);

  const resetHost = useCallback(() => {
    clearStoredHost();
    setHost(defaultHost());
  }, []);

  // Связь этой панели со стендом - в серверный журнал (диагностика «у кого не
  // подключалось»).
  const { reportConn, reportCmd, reportConfig, gate } = coord;
  const wasConnected = useRef(false);
  useEffect(() => {
    const connected = status === "connected";
    if (connected !== wasConnected.current) {
      wasConnected.current = connected;
      reportConn(connected);
    }
  }, [status, reportConn]);

  // Команды и параметры уходят на стенд только от владельца канала; каждое
  // действие пишется в серверный журнал и продлевает владение.
  const guardedSend = useCallback(
    (cmd: Command) => {
      if (!gate.allowed) return;
      send(cmd);
      reportCmd(`команда ${cmd.toUpperCase()}`);
    },
    [gate.allowed, send, reportCmd],
  );

  const guardedConfig = useCallback(
    async (cycles: number, dwellMs: number, speedUs: number, amplitudeDeg: number) => {
      if (!gate.allowed) return null;
      const res = await sendConfig(cycles, dwellMs, speedUs, amplitudeDeg);
      const a = res?.applied;
      reportConfig(
        !!a,
        a
          ? `параметры применены: циклов=${a.cycles} выдержка=${a.dwell_ms}мс скорость=${a.speed_us}мкс/шаг амплитуда=${a.amplitude_deg}°`
          : `параметры отклонены стендом (циклов=${cycles} выдержка=${dwellMs} скорость=${speedUs} амплитуда=${amplitudeDeg}): ${res?.error ?? "нет ответа"}${res?.detail ? ` - ${res.detail}` : ""}`,
      );
      return res;
    },
    [gate.allowed, sendConfig, reportConfig],
  );

  const state = telemetry?.state ?? null;

  return (
    <div className="app">
      <Header
        host={host}
        status={status}
        theme={theme}
        onApplyHost={applyHost}
        onResetHost={resetHost}
        onToggleTheme={toggle}
      />

      <div className="grid">
        {/* Ряд 0: канал управления - кто управляет стендом */}
        <LockBar coord={coord} />

        {/* Ряд 1: статус, прогресс циклов, угол */}
        <StatusCard telemetry={telemetry} />
        <CycleCard telemetry={telemetry} />
        <AngleDial telemetry={telemetry} />

        {/* Ряд 2: управление, параметры цикла */}
        <ControlsCard state={state} onCommand={guardedSend} gate={gate} />
        {/* key={host}: перемонтирование при смене стенда, чтобы карточка параметров
            заново взяла начальные значения из телеметрии нового стенда. */}
        <CycleConfigCard key={host} telemetry={telemetry} onApply={guardedConfig} gate={gate} />

        {/* Ряд 3: график угла, во всю ширину */}
        <AngleChart history={history} theme={theme} />

        {/* Ряд 4: журнал, во всю ширину */}
        <EventLog
          log={log}
          actions={
            <button className="chip small" onClick={() => setArchiveOpen(true)}>
              Архив журналов
            </button>
          }
        />
      </div>

      {archiveOpen && <LogArchive onClose={() => setArchiveOpen(false)} />}
      <Toasts toasts={coord.toasts} onDismiss={coord.dismissToast} />
    </div>
  );
}
