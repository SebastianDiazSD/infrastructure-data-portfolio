import dayjs from 'dayjs';

const TODAY_KEYWORDS = [
  'heute', 'today', 'hoy',
  'jetzt', 'now', 'ahora'
];

const YESTERDAY_KEYWORDS = [
  'gestern', 'yesterday', 'ayer'
];

export function resolveDateString(raw) {
  if (!raw) return null;

  const lower = raw.toLowerCase().trim();

  if (TODAY_KEYWORDS.includes(lower)) {
    return { date: dayjs(), wasKeyword: true, keyword: raw };
  }

  if (YESTERDAY_KEYWORDS.includes(lower)) {
    return { date: dayjs().subtract(1, 'day'), wasKeyword: true, keyword: raw };
  }

  // Try parsing as actual date
  const parsed = dayjs(raw);
  if (parsed.isValid()) {
    return { date: parsed, wasKeyword: false, keyword: null };
  }

  return null;
}