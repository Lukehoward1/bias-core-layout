// src/services/overlayBuilder.ts
// OverlayDescriptor type definitions (Stage 2). Builders land in Stage 4.
//
// ChartEngine renders overlays declaratively from this descriptor array.
// Adding a new overlay kind = add a variant + a render branch in ChartEngine.

import type { CalendarEvent } from '@/data/calendarEvents';

export type OverlayDescriptor =
  | { kind: 'price-line';     price: number; label: string; color: string; dash?: boolean }
  | { kind: 'event-marker';   timestamp: number; label: string; impact: 'high' | 'medium'; event: CalendarEvent }
  | { kind: 'session-line';   timestamp: number; label: string; color: string }
  | { kind: 'swing-marker';   timestamp: number; price: number; direction: 'high' | 'low' }
  | { kind: 'highlight-band'; from: number; to: number; color: string; label?: string };
