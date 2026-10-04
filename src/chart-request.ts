import type { ApiRequest } from './base.ts';

export const CHART_ATTRIBUTES = ['date', 'time', 'latitude', 'longitude', 'timezone-offset'];

/* Shared by every element drawn from POST /v1/chart, so they read the same attributes the same way. */
export function chartRequest(el: HTMLElement, prefix = ''): ApiRequest['body'] | null {
  const get = (n: string) => el.getAttribute(prefix + n);
  const date = get('date');
  const lat = get('latitude');
  const lon = get('longitude');
  if (!date || lat === null || lon === null) return null;
  const time = get('time') || '12:00';
  const tz = Number(get('timezone-offset'));
  return {
    date,
    time: time.length === 5 ? `${time}:00` : time,
    timezoneOffset: Number.isFinite(tz) ? tz : 0,
    latitude: Number(lat),
    longitude: Number(lon),
  };
}
