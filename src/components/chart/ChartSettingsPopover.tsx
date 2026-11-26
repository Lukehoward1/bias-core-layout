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
import { ColorSwatchField } from './ColorSwatchField';

// ── Types ─────────────────────────────────────────────────────

export type ColorPreset = 'classic' | 'colorblind' | 'mono' | 'custom';
export type CrosshairStyle = 'normal' | 'dashed' | 'dotted';
export type PriceScaleModeOption = 'auto' | 'logarithmic' | 'percentage';
export type BackgroundMode = 'auto' | 'light' | 'dark' | 'custom';

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
  // ── background ──────────────────────────────────────────────
  /** 'auto' follows the app theme; 'custom' uses backgroundColor. */
  backgroundMode: BackgroundMode;
  /** 6-digit hex; only applied when backgroundMode === 'custom'. */
  backgroundColor: string;
  // ── derived-colour overrides ─────────────────────────────────
  /** null = auto-derive from bg luminance. */
  gridColor: string | null;
  /** null = auto-derive from bg luminance. */
  crosshairColor: string | null;
  // ── overlay colours ──────────────────────────────────────────
  /** null = use the overlayBuilder multi-colour logic (HTF/bias/default). */
  levelColor: string | null;
  /** null = use per-session accent colours from sessionConfig. */
  sessionColor: string | null;
  /** SH markers + segment lines — 6-digit hex. */
  swingHighColor: string;
  /** SL markers + segment lines — 6-digit hex. */
  swingLowColor: string;
  /** null = impact-based (high=red, medium=amber). */
  newsPillColor: string | null;
}

// ── Candle colour presets ──────────────────────────────────────

interface PresetDef { upColor: string; downColor: string; label: string }

export const COLOR_PRESETS: Record<Exclude<ColorPreset, 'custom'>, PresetDef> = {
  classic:    { upColor: '#22c55e', downColor: '#ef4444', label: 'Classic' },
  colorblind: { upColor: '#3b82f6', downColor: '#f97316', label: 'Blue / Orange' },
  mono:       { upColor: '#94a3b8', downColor: '#475569', label: 'Mono' },
};

// ── Full chart theme presets ───────────────────────────────────

interface ChartThemePreset {
  label: string;
  backgroundMode: BackgroundMode;
  backgroundColor: string;
  colorPreset: ColorPreset;
  upColor: string;
  downColor: string;
}

const CHART_THEME_PRESETS: ChartThemePreset[] = [
  {
    label: 'Dark',
    backgroundMode: 'dark',
    backgroundColor: '#131722',
    colorPreset: 'classic',
    upColor: '#22c55e',
    downColor: '#ef4444',
  },
  {
    label: 'Light',
    backgroundMode: 'light',
    backgroundColor: '#e9edf3',
    colorPreset: 'classic',
    upColor: '#22c55e',
    downColor: '#ef4444',
  },
  {
    label: 'Slate',
    backgroundMode: 'custom',
    backgroundColor: '#1a2035',
    colorPreset: 'classic',
    upColor: '#22c55e',
    downColor: '#ef4444',
  },
];

// ── Defaults (must reproduce today's look exactly) ─────────────

export const DEFAULT_SETTINGS: ChartSettings = {
  colorPreset: 'classic',
  upColor: '#22c55e',
  downColor: '#ef4444',
  gridVertical: true,
  gridHorizontal: true,
  crosshairStyle: 'dashed',
  priceScaleMode: 'auto',
  backgroundMode: 'auto',
  backgroundColor: '#131722',
  gridColor: null,
  crosshairColor: null,
  levelColor: null,
  sessionColor: null,
  swingHighColor: '#ef4444',
  swingLowColor: '#22c55e',
  newsPillColor: null,
};

// ── Background / luminance utilities ──────────────────────────

const DARK_BG  = '#131722';
const LIGHT_BG = '#e9edf3';

/**
 * Returns the actual hex background colour for the chart given settings + app
 * theme ('dark' | 'light').  Exported so ChartEngine and CandlestickChart can
 * share the same logic without duplicating it.
 */
export function resolveChartBackground(
  settings: Pick<ChartSettings, 'backgroundMode' | 'backgroundColor'>,
  appTheme: 'dark' | 'light',
): string {
  if (settings.backgroundMode === 'custom') return settings.backgroundColor;
  if (settings.backgroundMode === 'light')  return LIGHT_BG;
  if (settings.backgroundMode === 'dark')   return DARK_BG;
  // 'auto' — follow app theme
  return appTheme === 'dark' ? DARK_BG : LIGHT_BG;
}

/**
 * Returns true if the hex colour is perceptually dark (relative luminance < 0.5).
 * Used to pick readable text / grid / crosshair colours from the chart background.
 */
export function isDarkHex(hex: string): boolean {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return true;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8)  & 0xff;
  const b = n & 0xff;
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b) < 0.5;
}

// ── Persistence ───────────────────────────────────────────────

const STORAGE_KEY = 'streambias.chartSettings.v1';

const isHex6 = (v: unknown): v is string =>
  typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);

const isHex6OrNull = (v: unknown): v is string | null =>
  v === null || isHex6(v);

export function loadSettings(): ChartSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const p = JSON.parse(raw) as Partial<Record<string, unknown>>;
    return {
      colorPreset: (['classic', 'colorblind', 'mono', 'custom'] as ColorPreset[]).includes(
        p.colorPreset as ColorPreset,
      )
        ? (p.colorPreset as ColorPreset)
        : DEFAULT_SETTINGS.colorPreset,
      upColor:   isHex6(p.upColor)   ? p.upColor   : DEFAULT_SETTINGS.upColor,
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
      // ── new fields — fall back gracefully so old saved settings still load ──
      backgroundMode: (['auto', 'light', 'dark', 'custom'] as BackgroundMode[]).includes(
        p.backgroundMode as BackgroundMode,
      )
        ? (p.backgroundMode as BackgroundMode)
        : DEFAULT_SETTINGS.backgroundMode,
      backgroundColor:
        isHex6(p.backgroundColor) ? p.backgroundColor : DEFAULT_SETTINGS.backgroundColor,
      gridColor:      isHex6OrNull(p.gridColor)      ? p.gridColor      : DEFAULT_SETTINGS.gridColor,
      crosshairColor: isHex6OrNull(p.crosshairColor) ? p.crosshairColor : DEFAULT_SETTINGS.crosshairColor,
      levelColor:     isHex6OrNull(p.levelColor)     ? p.levelColor     : DEFAULT_SETTINGS.levelColor,
      sessionColor:   isHex6OrNull(p.sessionColor)   ? p.sessionColor   : DEFAULT_SETTINGS.sessionColor,
      swingHighColor:
        isHex6(p.swingHighColor) ? p.swingHighColor : DEFAULT_SETTINGS.swingHighColor,
      swingLowColor:
        isHex6(p.swingLowColor) ? p.swingLowColor : DEFAULT_SETTINGS.swingLowColor,
      newsPillColor:  isHex6OrNull(p.newsPillColor)  ? p.newsPillColor  : DEFAULT_SETTINGS.newsPillColor,
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

// ── Component ──────────────────────────────────────────────────

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

const segBtn = (active: boolean) =>
  cn(
    'px-2.5 py-1 rounded border text-xs transition-colors select-none',
    active
      ? 'border-primary/50 bg-primary/10 text-foreground'
      : 'border-border/60 text-muted-foreground hover:border-border hover:text-foreground',
  );

const SectionHead = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
    {children}
  </p>
);

const Divider = () => <div className="h-px bg-border/40 my-2.5" />;

export function ChartSettingsPopover({ value, onChange }: Props) {
  function applyCandle(preset: Exclude<ColorPreset, 'custom'>) {
    const { upColor, downColor } = COLOR_PRESETS[preset];
    onChange({ ...value, colorPreset: preset, upColor, downColor });
  }

  function applyChartTheme(preset: ChartThemePreset) {
    onChange({
      ...value,
      backgroundMode: preset.backgroundMode,
      backgroundColor: preset.backgroundColor,
      colorPreset: preset.colorPreset,
      upColor: preset.upColor,
      downColor: preset.downColor,
      gridColor: null,
      crosshairColor: null,
    });
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
        className="w-80 p-3 bg-card border-border z-[200]"
      >
        {/* Scrollable body */}
        <div
          className="overflow-y-auto pr-0.5"
          style={{ maxHeight: 'min(72vh, 540px)' }}
        >

          {/* ── Background ──────────────────────── */}
          <SectionHead>Background</SectionHead>
          <div className="flex flex-wrap gap-1 mb-2">
            {(['auto', 'light', 'dark', 'custom'] as BackgroundMode[]).map((m) => (
              <button
                key={m}
                type="button"
                className={segBtn(value.backgroundMode === m)}
                onClick={() => onChange(set(value, 'backgroundMode', m))}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
          {value.backgroundMode === 'custom' && (
            <ColorSwatchField
              label="Background colour"
              value={value.backgroundColor}
              defaultValue={DEFAULT_SETTINGS.backgroundColor}
              onChange={(v) =>
                onChange(set(value, 'backgroundColor', v ?? DEFAULT_SETTINGS.backgroundColor))
              }
              className="mb-1"
            />
          )}

          <Divider />

          {/* ── Candle Colours ──────────────────── */}
          <SectionHead>Candle Colours</SectionHead>
          <div className="flex flex-wrap gap-1 mb-2">
            {(
              Object.entries(COLOR_PRESETS) as [Exclude<ColorPreset, 'custom'>, PresetDef][]
            ).map(([key, preset]) => (
              <button
                key={key}
                type="button"
                className={segBtn(value.colorPreset === key)}
                onClick={() => applyCandle(key)}
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
            ))}
            <button
              type="button"
              className={segBtn(value.colorPreset === 'custom')}
              onClick={() => onChange(set(value, 'colorPreset', 'custom'))}
            >
              Custom
            </button>
          </div>
          {value.colorPreset === 'custom' && (
            <div className="space-y-1.5 mb-1">
              <ColorSwatchField
                label="Up"
                value={value.upColor}
                defaultValue={DEFAULT_SETTINGS.upColor}
                onChange={(v) =>
                  onChange(set(value, 'upColor', v ?? DEFAULT_SETTINGS.upColor))
                }
              />
              <ColorSwatchField
                label="Down"
                value={value.downColor}
                defaultValue={DEFAULT_SETTINGS.downColor}
                onChange={(v) =>
                  onChange(set(value, 'downColor', v ?? DEFAULT_SETTINGS.downColor))
                }
              />
            </div>
          )}

          <Divider />

          {/* ── Grid & Crosshair ─────────────────── */}
          <SectionHead>Grid &amp; Crosshair</SectionHead>
          <div className="flex gap-1 mb-2">
            {(
              [
                { key: 'gridVertical'   as const, label: 'Vertical'   },
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
          <div className="space-y-1.5 mb-2">
            <ColorSwatchField
              label="Grid colour"
              value={value.gridColor}
              defaultValue="#293249"
              onChange={(v) => onChange(set(value, 'gridColor', v))}
              nullable
            />
            <div className="flex gap-1">
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
            <ColorSwatchField
              label="Crosshair colour"
              value={value.crosshairColor}
              defaultValue="#5a6a8a"
              onChange={(v) => onChange(set(value, 'crosshairColor', v))}
              nullable
            />
          </div>

          <Divider />

          {/* ── Price Scale ───────────────────── */}
          <SectionHead>Price Scale</SectionHead>
          <div className="flex gap-1 mb-0.5">
            {(
              [
                { val: 'auto',        label: 'Auto' },
                { val: 'logarithmic', label: 'Log'  },
                { val: 'percentage',  label: '%'    },
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

          <Divider />

          {/* ── Overlay Colours ──────────────────── */}
          <SectionHead>Overlay Colours</SectionHead>
          <div className="space-y-1.5 mb-1">
            <ColorSwatchField
              label="Key level lines"
              value={value.levelColor}
              defaultValue="#ef4444"
              onChange={(v) => onChange(set(value, 'levelColor', v))}
              nullable
            />
            <ColorSwatchField
              label="Session hairlines"
              value={value.sessionColor}
              defaultValue="#f4d35e"
              onChange={(v) => onChange(set(value, 'sessionColor', v))}
              nullable
            />
            <ColorSwatchField
              label="Swing High (SH)"
              value={value.swingHighColor}
              defaultValue={DEFAULT_SETTINGS.swingHighColor}
              onChange={(v) =>
                onChange(set(value, 'swingHighColor', v ?? DEFAULT_SETTINGS.swingHighColor))
              }
            />
            <ColorSwatchField
              label="Swing Low (SL)"
              value={value.swingLowColor}
              defaultValue={DEFAULT_SETTINGS.swingLowColor}
              onChange={(v) =>
                onChange(set(value, 'swingLowColor', v ?? DEFAULT_SETTINGS.swingLowColor))
              }
            />
            <ColorSwatchField
              label="News pill accent"
              value={value.newsPillColor}
              defaultValue="#ef4444"
              onChange={(v) => onChange(set(value, 'newsPillColor', v))}
              nullable
            />
          </div>

          <Divider />

          {/* ── Chart Theme Presets ───────────────── */}
          <SectionHead>Chart Themes</SectionHead>
          <div className="flex gap-1 mb-2">
            {CHART_THEME_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className={segBtn(
                  value.backgroundMode === preset.backgroundMode &&
                  (preset.backgroundMode !== 'custom' ||
                    value.backgroundColor === preset.backgroundColor),
                )}
                onClick={() => applyChartTheme(preset)}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <Divider />

          {/* ── Reset ─────────────────────────── */}
          <button
            type="button"
            className="w-full text-center px-2 py-1.5 rounded border border-border/60 text-xs text-muted-foreground hover:border-border hover:text-foreground transition-colors"
            onClick={() => onChange(DEFAULT_SETTINGS)}
          >
            Reset to defaults
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
