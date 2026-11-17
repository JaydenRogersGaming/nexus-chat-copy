import { addDays } from 'date-fns';

export type CalHoliday = { key: string; name: string; emoji: string; color: string; date: (y: number) => Date };

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);
const nth = (y: number, m: number, wd: number, n: number) => { const f = d(y, m, 1); return d(y, m, 1 + ((wd - f.getDay() + 7) % 7) + (n - 1) * 7); };
const last = (y: number, m: number, wd: number) => { const l = new Date(y, m, 0); return d(y, m, l.getDate() - ((l.getDay() - wd + 7) % 7)); };
function easter(y: number) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, dd = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - dd - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  return d(y, Math.floor((h + l - 7 * m + 114) / 31), ((h + l - 7 * m + 114) % 31) + 1);
}

export const CAL_HOLIDAYS: CalHoliday[] = [
  { key: 'newyear', name: "New Year's Day", emoji: '🎆', color: '#facc15', date: y => d(y, 1, 1) },
  { key: 'mlk', name: 'Martin Luther King Jr. Day', emoji: '✊🏿', color: '#a78bfa', date: y => nth(y, 1, 1, 3) },
  { key: 'groundhog', name: 'Groundhog Day', emoji: '🦫', color: '#a16207', date: y => d(y, 2, 2) },
  { key: 'valentines', name: "Valentine's Day", emoji: '💘', color: '#f43f5e', date: y => d(y, 2, 14) },
  { key: 'presidents', name: "Presidents' Day", emoji: '🇺🇸', color: '#3b82f6', date: y => nth(y, 2, 1, 3) },
  { key: 'pi', name: 'Pi Day', emoji: '🥧', color: '#f59e0b', date: y => d(y, 3, 14) },
  { key: 'stpatricks', name: "St. Patrick's Day", emoji: '☘️', color: '#22c55e', date: y => d(y, 3, 17) },
  { key: 'aprilfools', name: "April Fools' Day", emoji: '🤡', color: '#ec4899', date: y => d(y, 4, 1) },
  { key: 'easter', name: 'Easter', emoji: '🐣', color: '#fde047', date: easter },
  { key: 'earth', name: 'Earth Day', emoji: '🌎', color: '#10b981', date: y => d(y, 4, 22) },
  { key: 'cinco', name: 'Cinco de Mayo', emoji: '🪅', color: '#ef4444', date: y => d(y, 5, 5) },
  { key: 'mothers', name: "Mother's Day", emoji: '💐', color: '#f472b6', date: y => nth(y, 5, 0, 2) },
  { key: 'memorial', name: 'Memorial Day', emoji: '🎖️', color: '#64748b', date: y => last(y, 5, 1) },
  { key: 'fathers', name: "Father's Day", emoji: '👔', color: '#0ea5e9', date: y => nth(y, 6, 0, 3) },
  { key: 'juneteenth', name: 'Juneteenth', emoji: '✊🏾', color: '#dc2626', date: y => d(y, 6, 19) },
  { key: 'independence', name: 'Independence Day', emoji: '🎇', color: '#ef4444', date: y => d(y, 7, 4) },
  { key: 'labor', name: 'Labor Day', emoji: '🛠️', color: '#f97316', date: y => nth(y, 9, 1, 1) },
  { key: 'columbus', name: "Indigenous Peoples' / Columbus Day", emoji: '🪶', color: '#b45309', date: y => nth(y, 10, 1, 2) },
  { key: 'halloween', name: 'Halloween', emoji: '🎃', color: '#f97316', date: y => d(y, 10, 31) },
  { key: 'veterans', name: 'Veterans Day', emoji: '🎗️', color: '#2563eb', date: y => d(y, 11, 11) },
  { key: 'thanksgiving', name: 'Thanksgiving', emoji: '🦃', color: '#d97706', date: y => nth(y, 11, 4, 4) },
  { key: 'christmaseve', name: 'Christmas Eve', emoji: '🕯️', color: '#16a34a', date: y => d(y, 12, 24) },
  { key: 'christmas', name: 'Christmas', emoji: '🎄', color: '#22c55e', date: y => d(y, 12, 25) },
  { key: 'nye', name: "New Year's Eve", emoji: '🥂', color: '#eab308', date: y => d(y, 12, 31) },
];

const same = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
export const holidaysOn = (day: Date) => CAL_HOLIDAYS.filter(h => same(h.date(day.getFullYear()), day));

/** Next date (today counts) this holiday happens. */
export function nextOccurrence(h: CalHoliday, from = new Date()) {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const t = h.date(today.getFullYear());
  return t >= today ? t : h.date(today.getFullYear() + 1);
}
export function daysUntil(h: CalHoliday, from = new Date()) {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((nextOccurrence(h, from).getTime() - today.getTime()) / 864e5);
}
export const upcoming = (n: number, from = new Date()) => [...CAL_HOLIDAYS].sort((a, b) => daysUntil(a, from) - daysUntil(b, from)).slice(0, n);
export { addDays };
