import type { Telemetry } from "../types";

interface Props {
  telemetry: Telemetry | null;
}

const SIZE = 200;
const CX = SIZE / 2;
const CY = 118;   // центр дуги смещён вниз, чтобы полукруг занял верх карточки
const R = 80;

// bend-кадр -> экран: 0° = ЛЕВО, 90° = ВЕРХ, 180° = ПРАВО. Полукруг сверху.
// В SVG угол 180° (математический) смотрит влево, 90° вверх, 0° вправо; y растёт
// вниз. bend b (0..180) отображается на математический угол (180 - b):
//   b=0   -> 180° (лево),  b=90 -> 90° (верх),  b=180 -> 0° (право).
function pointAt(bendDeg: number, r = R): { x: number; y: number } {
  const math = (180 - bendDeg) * (Math.PI / 180);
  return { x: CX + r * Math.cos(math), y: CY - r * Math.sin(math) };
}

// Дуга по bend-кадру от a к b (оба 0..180). Полукруг, поэтому largeArc всегда 0.
function arcPath(fromBend: number, toBend: number, r = R): string {
  const a = pointAt(fromBend, r);
  const b = pointAt(toBend, r);
  // При росте bend математический угол УБЫВАЕТ -> по часовой стрелке на экране ->
  // sweep 1.
  const sweep = toBend >= fromBend ? 1 : 0;
  return `M ${a.x} ${a.y} A ${r} ${r} 0 0 ${sweep} ${b.x} ${b.y}`;
}

export function AngleDial({ telemetry }: Props) {
  const bend = telemetry?.bend_angle_deg ?? null;
  const abs = telemetry?.encoder_abs_deg ?? null;
  const fault = telemetry ? telemetry.encoder_fault === 1 : false;

  const has = bend !== null;
  const clamped = has ? Math.max(0, Math.min(180, bend as number)) : 90;
  const dot = pointAt(clamped);
  const dotColor = fault ? "var(--danger)" : "var(--accent)";

  // Метки-засечки 0 / 90 / 180.
  const ticks = [0, 90, 180].map((b) => {
    const o = pointAt(b, R + 9);
    const i = pointAt(b, R - 9);
    const lbl = pointAt(b, R + 22);
    return { b, o, i, lbl };
  });

  return (
    <section className="card col-4">
      <div className="title">
        <h2>Угол изгиба</h2>
      </div>
      <div className="dial-grid">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {/* фон-полукруг 0..180 */}
          <path d={arcPath(0, 180)} fill="none" stroke="var(--border-2)" strokeWidth="7" strokeLinecap="round" />

          {/* дуга от центра 90 -> к текущему углу */}
          {has && Math.abs(clamped - 90) > 0.5 && (
            <path d={arcPath(90, clamped)} fill="none"
                  stroke="var(--accent)" strokeWidth="7" strokeLinecap="round" opacity="0.6" />
          )}

          {/* засечки и подписи 0 / 90 / 180 */}
          {ticks.map((t) => (
            <g key={t.b}>
              <line x1={t.i.x} y1={t.i.y} x2={t.o.x} y2={t.o.y}
                    stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round" />
              <text x={t.lbl.x} y={t.lbl.y + 4} textAnchor="middle" fontSize="12"
                    fill="var(--muted)">{t.b}°</text>
            </g>
          ))}

          {/* центральная точка покоя (90) */}
          <circle cx={pointAt(90).x} cy={pointAt(90).y} r={3} fill="var(--muted)" />
          {/* текущий угол */}
          {has && <circle cx={dot.x} cy={dot.y} r={7} fill={dotColor} />}

          <text
            x={CX} y={CY - 6} textAnchor="middle" fontSize="26"
            fontWeight={has ? 800 : 300}
            fill={has ? "var(--text-hi)" : "var(--faint)"}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {has ? `${(bend as number).toFixed(1)}°` : "–"}
          </text>
        </svg>

        <div className="dial-diag">
          <div className="diag-item">
            <div className="k">Угол изгиба</div>
            <div className="v num">
              {has ? `${(bend as number).toFixed(1)}°` : <span className="empty">–</span>}
            </div>
          </div>
          <div className="diag-item">
            <div className="k">Абс. угол · AS5600</div>
            <div className="v num">
              {abs !== null ? <>{abs.toFixed(2)}°<span className="sub">180° ≈ 106° абс.</span></> : <span className="empty">–</span>}
            </div>
          </div>
          <div className="diag-item">
            <div className="k">Энкодер</div>
            <div className="v">
              {telemetry
                ? <span className={`tag ${fault ? "fault" : "ok"}`}>{fault ? "ошибка" : "норма"}</span>
                : <span className="empty">–</span>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
