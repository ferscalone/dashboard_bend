// ── Определение хоста стенда ──────────────────────────────────────────────────
// Дашборд переносим: одна и та же собранная сборка должна работать независимо от
// адреса стенда в любой сети, где она развёрнута. Поэтому хост определяется во
// ВРЕМЯ ВЫПОЛНЕНИЯ, никогда не зашивается жёстко, в таком порядке приоритета:
//
//   1. localStorage("bend.stand_host") - задаётся из поля в шапке; для каждого браузера.
//   2. import.meta.env.VITE_STAND_HOST - необязательное значение по умолчанию из
//                                        сборки (.env).
//   3. DEFAULT_HOST                  - домен стенда как последний вариант.
//
// Определённый хост всегда показан в шапке и может быть сброшен, поэтому он
// никогда не «залипнет» на неверном значении незаметно.

// Ключ со своим префиксом: за шлюзом все панели живут на одном адресе (одном
// origin) и делят localStorage - общий ключ перетирал бы адрес соседнего стенда.
const LS_KEY = "bend.stand_host";

// Значение по умолчанию как последний вариант: домен изгибного стенда. Число в
// начале - это номер стенда. Домен заводится сетевым хостом на выделенный IP,
// который DHCP выдаёт стенду по его MAC.
export const DEFAULT_HOST = "192.168.3.54";

// Значения конфигурации, зеркалированные из прошивки Config.h. Это запасной
// вариант ДО ПОДКЛЮЧЕНИЯ, показываемый до прихода первого кадра телеметрии; после
// подключения карточка параметров берёт начальные значения из живой телеметрии
// (cfg_*) и может ЗАПИСЫВАТЬ новые значения через POST /v1/config (сохраняются в
// NVS на стенде).
export const FIRMWARE = {
  cycles: 10, // CYCLES_DEFAULT
  dwellMs: 1000, // DWELL_MS_DEFAULT
  speedUs: 4000, // SPEED_US_DEFAULT (было 1200 - прошивка замедлена, см. CHANGES.md)
  amplitudeDeg: 90, // AMPLITUDE_DEG_DEFAULT
  // bend-разметка: центр (покой) = 90°, крайние точки 0° и 180°.
  bendCenterDeg: 90,
} as const;

// Границы разумности параметров (зеркалируют Config.h; клиент проверяет ими ввод
// до отправки, но авторитет - валидатор прошивки).
export const LIMITS = {
  cyclesMin: 1,
  cyclesMax: 1000000,
  dwellMsMin: 0,
  dwellMsMax: 600000,
  // SPEED_US_MIN = 1000 в прошивке: быстрее мотор без разгона пропускает шаги.
  // Раньше здесь стояло 200 - панель пропускала 200…999, а стенд отвечал 400
  // "speed out of range".
  speedUsMin: 1000,
  speedUsMax: 60000,
  amplitudeMin: 5,
  amplitudeMax: 90,
} as const;

function envHost(): string | undefined {
  const v = import.meta.env.VITE_STAND_HOST;
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

/** Определить хост стенда по приведённой выше цепочке приоритетов. */
export function resolveHost(): string {
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored && stored.trim()) return stored.trim();
  } catch {
    // localStorage может быть недоступен (приватный режим / file://); идём дальше.
  }
  return envHost() ?? DEFAULT_HOST;
}

/** Сохранить введённый пользователем хост. Пустая строка снимает переопределение. */
export function setStoredHost(host: string): void {
  try {
    const h = host.trim();
    if (h) localStorage.setItem(LS_KEY, h);
    else localStorage.removeItem(LS_KEY);
  } catch {
    // игнорировать сбой сохранения - хост в памяти всё равно действует в текущем сеансе работы.
  }
}

/** Снять любое сохранённое переопределение, чтобы resolveHost() откатился к env/умолчанию. */
export function clearStoredHost(): void {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    // игнорируется
  }
}

/** Значение по умолчанию, которое использовало бы приложение без сохранённого переопределения. */
export function defaultHost(): string {
  return envHost() ?? DEFAULT_HOST;
}

export const httpBase = (host: string) => `http://${host}`;
export const wsUrl = (host: string) => `ws://${host}/ws`;
