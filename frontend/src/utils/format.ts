// Presentation-only formatting of backend values. Nothing here computes a
// recommendation; it only renders numbers and timestamps the backend returned.

import type { Prescription } from '../types/api';

const HAS_TZ = /(Z|[+-]\d{2}:?\d{2})$/i;

/** Backend timestamps are naive UTC ("2026-09-14T15:20:59"); parse them as UTC, not local. */
export function parseUtc(iso: string): Date {
  return new Date(HAS_TZ.test(iso) ? iso : `${iso}Z`);
}

/** Inverse of parseUtc: the backend's naive UTC format, second precision. */
export function toNaiveUtc(date: Date): string {
  return date.toISOString().slice(0, 19);
}

export function formatWeight(kg: number): string {
  const text = Number.isInteger(kg) ? String(kg) : kg.toFixed(1).replace(/\.0$/, '');
  return `${text} kg`;
}

export function formatPrescription(p: Prescription): string {
  return `${formatWeight(p.weight)} × ${p.reps} × ${p.sets}`;
}

export function formatDate(iso: string): string {
  return parseUtc(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatTime(iso: string): string {
  return parseUtc(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/** Local calendar day, used to group history rows. */
export function localDayKey(iso: string): string {
  const d = parseUtc(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dayKeyOf(date: Date): string {
  return localDayKey(date.toISOString());
}

/** "Today" / "Yesterday" / "Mon, Sep 8", relative to the viewer's local day. */
export function formatDayLabel(iso: string): string {
  const key = localDayKey(iso);
  const now = new Date();
  if (key === dayKeyOf(now)) return 'Today';
  if (key === dayKeyOf(new Date(now.getTime() - 24 * 3600 * 1000))) return 'Yesterday';
  return parseUtc(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}


export function formatScore(score: number): string {
  return `${Math.round(score)}`;
}
