import type { Telemetry } from "../types";
import { phaseLabel } from "../standLogic";

interface Props {
  telemetry: Telemetry | null;
}

/** Прогресс программы циклов: сделано / всего, полоса прогресса, текущая фаза. */
export function CycleCard({ telemetry }: Props) {
  const done = telemetry?.cycles_done ?? null;
  const target = telemetry?.cycles_target ?? null;
  const phase = telemetry?.phase ?? null;

  const pct =
    done !== null && target !== null && target > 0
      ? Math.min(100, (done / target) * 100)
      : 0;

  return (
    <section className="card col-4 stretch">
      <div className="title">
        <h2>Циклы</h2>
      </div>

      <div className="force">
        <span className="group">
          {done !== null ? (
            <>
              <span className="val num">{done}</span>
              <span className="unit">/ {target ?? "–"}</span>
            </>
          ) : (
            <span className="val empty">–</span>
          )}
        </span>
      </div>

      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="meta-list">
        <div className="row">
          <span>Фаза</span>
          {telemetry ? (
            <span className="val">{phaseLabel(phase)}</span>
          ) : (
            <span className="val empty">–</span>
          )}
        </div>
      </div>
    </section>
  );
}
