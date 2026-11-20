// src/components/chart/ChartSettingsPopover.tsx
// Gear-button popover for live chart appearance settings.
// All changes call chart.applyOptions / series.applyOptions — no chart recreation.
/* eslint-disable react-refresh/only-export-components */

import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────

export type ColorPreset = 'classic' | 'colorblind' | 'mono' | 'custom';
export type CrosshairStyle = 'normal' | 'dashed' | 'dotted';
export type PriceScaleModeOption = 'auto' | 'logarithmic' | 'percentage';

export interface ChartSettings {
  colorPreset: ColorPreset;
  /** Up-bar body / border / wick colour — 6-digit hex. */
  upColor: string;
  /** Down-bar body / border / wick colour — 6-digit hex. */
  downColor: string;
  gridVertical: boolean;
  gridHorizontal: boolean;
  crosshairStyle: CrosshairStyle;
  priceScaleMode: PriceScaleModeOption;
}

// ── Presets ───────────────────────────────────────────────────

interface PresetDef { upColor: string; downColor: string; label: string }

export const COLOR_PRESETS: Record<Exclude<ColorPreset, 'custom'>, PresetDef> = {
  // #22c55e ≈ hsl(142,71%,45%)  #ef4444 ≈ hsl(0,84%,60%) — matches ChartEngine's current hardcoded values
  classic:    { upColor: '#22c55e', downColor: '#ef4444', label: 'Classic' },
  colorblind: { upColor: '#3b82f6', downColor: '#f97316', label: 'Blue / Orange' },
  mono:       { upColor: '#94a3b8', downColor: '#475569', label: 'Mono' },
};

// ── Defaults (must reproduce today's look exactly) ────────────

export const DEFAULT_SETTINGS: ChartSettings = {
  colorPreset: 'classic',
  upColor: '#22c55e',
  downColor: '#ef4444',
  gridVertical: true,
  gridHorizontal: true,
  crosshairStyle: 'dashed', // matches ChartEngine's current style: 2 (LineStyle.Dashed)
  priceScaleMode: 'auto',
};

// ── Persistence ───────────────────────────────────────────────

const STORAGE_KEY = 'streambias.chartSettings.v1';

const isHex6 = (v: unknown): v is string =>
  typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);

export function loadSettings(): ChartSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const p = JSON.parse(raw) as Partial<ChartSettings>;
    return {
      colorPreset: (['classic', 'colorblind', 'mono', 'custom'] as ColorPreset[]).includes(
        p.colorPreset as ColorPreset,
      )
        ? (p.colorPreset as ColorPreset)
        : DEFAULT_SETTINGS.colorPreset,
      upColor: isHex6(p.upColor) ? p.upColor : DEFAULT_SETTINGS.upColor,
      downColor: isHex6(p.downColor) ? p.downColor : DEFAULT_SETTINGS.downColor,
      gridVertical:
        typeof p.gridVertical === 'boolean' ? p.gridVertical : DEFAULT_SETTINGS.gridVertical,
      gridHorizontal:
        typeof p.gridHorizontal === 'boolean' ? p.gridHorizontal : DEFAULT_SETTINGS.gridHorizontal,
      crosshairStyle: (['normal', 'dashed', 'dotted'] as CrosshairStyle[]).includes(
        p.crosshairStyle as CrosshairStyle,
      )
        ? (p.crosshairStyle as CrosshairStyle)
        : DEFAULT_SETTINGS.crosshairStyle,
      priceScaleMode: (['auto', 'logarithmic', 'percentage'] as PriceScaleModeOption[]).includes(
        p.priceScaleMode as PriceScaleModeOption,
      )
        ? (p.priceScaleMode as PriceScaleModeOption)
        : DEFAULT_SETTINGS.priceScaleMode,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: ChartSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch { /* ignore quota / private-browsing errors */ }
}

// ── Component ─────────────────────────────────────────────────

interface Props {
  value: ChartSettings;
  onChange: (s: ChartSettings) => void;
}

function set<K extends keyof ChartSettings>(
  prev: ChartSettings,
  key: K,
  val: ChartSettings[K],
): ChartSettings {
  return { ...prev, [key]: val };
}

// Shared style for segmented-control buttons inside the popover
const segBtn = (active: boolean) =>
  cn(
    'px-2.5 py-1 rounded border text-xs transition-colors select-none',
    active
      ? 'border-primary/50 bg-primary/10 text-foreground'
      : 'border-border/60 text-muted-foreground hover:border-border hover:text-foreground',
  );

export function ChartSettingsPopover({ value, onChange }: Props) {
  function applyPreset(preset: Exclude<ColorPreset, 'custom'>) {
    const { upColor, downColor } = COLOR_PRESETS[preset];
    onChange({ ...value, colorPreset: preset, upColor, downColor });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          title="Chart settings"
        >
          <Settings className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        className="w-72 p-3 bg-card border-border z-[200]"
      >
        {/* ── Candle Colours ──────────────────── */}
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
          Candle Colours
        </p>

        <div className="flex flex-wrap gap-1 mb-2">
          {(Object.entries(COLOR_PRESETS) as [Exclude<ColorPreset, 'custom'>, PresetDef][]).map(
            ([key, preset]) => (
              <button
                key={key}
                type="button"
                className={segBtn(value.colorPreset === key)}
                onClick={() => applyPreset(key)}
              >
                <span className="inline-flex gap-0.5 mr-1.5 align-middle">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-sm"
                    style={{ background: preset.upColor }}
                  />
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-sm"
                    style={{ background: preset.downColor }}
                  />
                </span>
                {preset.label}
              </button>
            ),
          )}
          <button
            type="button"
            className={segBtn(value.colorPreset === 'custom')}
            onClick={() => onChange(set(value, 'colorPreset', 'custom'))}
          >
            Custom
          </button>
        </div>

        {value.colorPreset === 'custom' && (
          <div className="flex items-center gap-4 mb-1">
            {(['up', 'down'] as const).map((dir) => {
              const colorKey = dir === 'up' ? 'upColor' : 'downColor';
              const color = value[colorKey];
              return (
                <label
                  key={dir}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer"
                >
                  {dir === 'up' ? 'Up' : 'Down'}
                  <span className="relative inline-block w-6 h-6 rounded border border-border/60 cursor-pointer hover:border-border">
                    <span
                      className="absolute inset-0 rounded"
                      style={{ background: color }}
                    />
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => onChange(set(value, colorKey, e.target.value))}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                  </span>
                </label>
              );
            })}
          </div>
        )}

        <div className="h-px bg-border/40 my-2.5" />

        {/* ── Grid ──────────────────────────── */}
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
          Grid
        </p>
        <div className="flex gap-1 mb-0.5">
          {(
            [
              { key: 'gridVertical' as const, label: 'Vertical' },
              { key: 'gridHorizontal' as const, label: 'Horizontal' },
            ] as { key: 'gridVertical' | 'gridHorizontal'; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={segBtn(value[key])}
              onClick={() => onChange(set(value, key, !value[key]))}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="h-px bg-border/40 my-2.5" />

        {/* ── Crosshair ─────────────────────── */}
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
          Crosshair
        </p>
        <div className="flex gap-1 mb-0.5">
          {(['normal', 'dashed', 'dotted'] as CrosshairStyle[]).map((s) => (
            <button
              key={s}
              type="button"
              className={segBtn(value.crosshairStyle === s)}
              onClick={() => onChange(set(value, 'crosshairStyle', s))}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <div className="h-px bg-border/40 my-2.5" />

        {/* ── Price Scale ───────────────────── */}
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
          Price Scale
        </p>
        <div className="flex gap-1 mb-0.5">
          {(
            [
              { val: 'auto', label: 'Auto' },
              { val: 'logarithmic', label: 'Log' },
              { val: 'percentage', label: '%' },
            ] as { val: PriceScaleModeOption; label: string }[]
          ).map(({ val, label }) => (
            <button
              key={val}
              type="button"
              className={segBtn(value.priceScaleMode === val)}
              onClick={() => onChange(set(value, 'priceScaleMode', val))}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="h-px bg-border/40 my-2.5" />

        {/* ── Reset ─────────────────────────── */}
        <button
          type="button"
          className="w-full text-center px-2 py-1.5 rounded border border-border/60 text-xs text-muted-foreground hover:border-border hover:text-foreground transition-colors"
          onClick={() => onChange(DEFAULT_SETTINGS)}
        >
          Reset to defaults
        </button>
      </PopoverContent>
    </Popover>
  );
}
