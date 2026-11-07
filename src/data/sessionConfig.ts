export interface SessionConfig {
  name: string;
  accent: string;
  region: string;
  timeZone: string;
  openHour: number;
  openMinute: number;
  closeHour: number;
  closeMinute: number;
}

export const SESSION_CONFIGS: readonly SessionConfig[] = [
  {
    name: 'Sydney',
    accent: '#2EC4B6',
    region: 'Asia-Pacific Markets',
    timeZone: 'Australia/Sydney',
    openHour: 9,
    openMinute: 0,
    closeHour: 17,
    closeMinute: 0,
  },
  {
    name: 'Asia',
    accent: '#4361EE',
    region: 'Asia-Pacific Markets',
    timeZone: 'Asia/Tokyo',
    openHour: 9,
    openMinute: 0,
    closeHour: 15,
    closeMinute: 0,
  },
  {
    name: 'London',
    accent: '#F4D35E',
    region: 'European Markets',
    timeZone: 'Europe/London',
    openHour: 8,
    openMinute: 0,
    closeHour: 16,
    closeMinute: 30,
  },
  {
    name: 'New York',
    accent: '#F77F00',
    region: 'US Markets',
    timeZone: 'America/New_York',
    openHour: 9,
    openMinute: 30,
    closeHour: 16,
    closeMinute: 0,
  },
];
