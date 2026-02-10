/**
 * แปลง date string หรือ Date เป็นข้อความที่อ่านง่าย (locale + time)
 */
export function formatDate(value: string | Date | null | undefined): string {
  if (value == null) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}
