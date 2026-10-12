import { useEffect, useRef, useState } from "react";
import { FIRMWARE, LIMITS } from "../config";
import type { ConfigApplyResponse, Telemetry } from "../types";
import { Stepper } from "./Stepper";
import type { Gate } from "../coord/useCoordinator";
import { LockTag } from "./LockTag";

interface Props {
  telemetry: Telemetry | null;
  onApply: (
    cycles: number,
    dwellMs: number,
    speedUs: number,
    amplitudeDeg: number,
  ) => Promise<ConfigApplyResponse | null>;
  /** Право управления: применять параметры может только владелец канала. */
  gate: Gate;
}

/**
 * Параметры программы циклов: число циклов, выдержка в крайних точках (мс),
 * скорость поворота (мкс/шаг) и амплитуда (половина размаха от центра 90°). Живой
 * элемент управления: заполняет поля из телеметрии (до первого кадра - значения
 * прошивки по умолчанию), проверяет ввод на стороне клиента и отправляет через
 * `onApply` методом POST. Ответ прошивки является определяющим.
 */
export function CycleConfigCard({ telemetry, onApply, gate }: Props) {
  const [cycles, setCycles] = useState<number>(FIRMWARE.cycles);
  const [dwellMs, setDwellMs] = useState<number>(FIRMWARE.dwellMs);
  const [speedUs, setSpeedUs] = useState<number>(FIRMWARE.speedUs);
  const [amplitude, setAmplitude] = useState<number>(FIRMWARE.amplitudeDeg);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  // Заполнение полей из первого пришедшего кадра телеметрии - ЕСЛИ ТОЛЬКО оператор
  // уже не начал редактирование. `dirty` переключается при касании любого поля,
  // поэтому заполнение никогда не затирает редактирование в процессе.
  const seeded = useRef(false);
  const dirty = useRef(false);
  const markDirty = <T,>(setter: (v: T) => void) => (v: T) => {
    dirty.current = true;
    setter(v);
  };
  useEffect(() => {
    if (seeded.current || dirty.current || !telemetry) return;
    seeded.current = true;
    setCycles(telemetry.cfg_cycles);
    setDwellMs(telemetry.cfg_dwell_ms);
    setSpeedUs(telemetry.cfg_speed_us);
    setAmplitude(telemetry.cfg_amplitude_deg);
  }, [telemetry]);

  // Целочисленные поля округляются вниз до целых перед проверкой/отправкой.
  const cyclesI = Math.floor(cycles);
  const dwellI = Math.floor(dwellMs);
  const speedI = Math.floor(speedUs);

  const warning =
    cyclesI < LIMITS.cyclesMin || cyclesI > LIMITS.cyclesMax
      ? `Число циклов вне диапазона ${LIMITS.cyclesMin}…${LIMITS.cyclesMax}.`
      : dwellI < LIMITS.dwellMsMin || dwellI > LIMITS.dwellMsMax
        ? `Выдержка вне диапазона ${LIMITS.dwellMsMin}…${LIMITS.dwellMsMax} мс.`
        : speedI < LIMITS.speedUsMin || speedI > LIMITS.speedUsMax
          ? `Скорость вне диапазона ${LIMITS.speedUsMin}…${LIMITS.speedUsMax} мкс/шаг.`
          : amplitude < LIMITS.amplitudeMin || amplitude > LIMITS.amplitudeMax
            ? `Амплитуда вне диапазона ${LIMITS.amplitudeMin}…${LIMITS.amplitudeMax}°.`
            : null;

  const canApply = !warning && !applying && gate.allowed;

  const handleApply = async () => {
    if (!canApply) return;
    setApplying(true);
    setResult(null);
    const res = await onApply(cyclesI, dwellI, speedI, amplitude);
    if (res?.applied) {
      const a = res.applied;
      setResult({
        ok: true,
        text: `Применено: циклов=${a.cycles} выдержка=${a.dwell_ms}мс скорость=${a.speed_us}мкс амплитуда=${a.amplitude_deg}°`,
      });
      dirty.current = false;
    } else {
      const detail = res?.detail ? `: ${res.detail}` : "";
      setResult({ ok: false, text: `Отклонено (${res?.error ?? "ошибка"})${detail}` });
    }
    setApplying(false);
  };

  // Итоговый размах для подсказки: центр 90° ± амплитуда.
  const sweepLo = Math.max(0, FIRMWARE.bendCenterDeg - amplitude);
  const sweepHi = Math.min(180, FIRMWARE.bendCenterDeg + amplitude);

  return (
    <section className="card col-7">
      <div className="title">
        <h2>Параметры цикла</h2>
        <LockTag gate={gate} />
      </div>

      <div className="form-grid">
        <div className="field-row">
          <div className="field">
            <label>Число циклов</label>
            <Stepper value={cycles} step={1} onChange={markDirty(setCycles)} />
          </div>
          <div className="field">
            <label>Выдержка, мс</label>
            <Stepper value={dwellMs} step={100} onChange={markDirty(setDwellMs)} />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label>Скорость, мкс/шаг</label>
            <Stepper value={speedUs} step={100} onChange={markDirty(setSpeedUs)} />
          </div>
          <div className="field">
            <label>Амплитуда, °</label>
            <Stepper value={amplitude} step={5} onChange={markDirty(setAmplitude)} />
          </div>
        </div>

        <div className="hint">
          Размах: {sweepLo.toFixed(0)}° … {sweepHi.toFixed(0)}° (центр 90°).
          Один цикл - полный проход 0°→180°→0°.
        </div>

        {warning && <div className="warn-line">⚠ {warning}</div>}
        {!gate.allowed && <div className="lock-line">Применить нельзя: {gate.reason}</div>}

        <button className="btn-apply" disabled={!canApply} onClick={handleApply}>
          {applying ? "Применение…" : "Применить"}
        </button>

        {result && (
          <div className={result.ok ? "note" : "warn-line"}>
            {result.ok ? "✓" : "⚠"} {result.text}
          </div>
        )}
      </div>
    </section>
  );
}
