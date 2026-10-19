import React from 'react';
import { Card, Select, Space, Typography } from 'antd';
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { T } from '@/theme/designTokens';

const { Text } = Typography;

/** 현황판 공용 부품 — KPI 타일·차트 카드·월별 막대/선·기간 선택. 색은 디자인 토큰만 쓴다. */

export const MONTHS = Array.from({ length: 12 }, (_, i) => `${i + 1}월`);

export const C_PRIMARY = T.primary;
export const C_SECOND = '#E06C00';
export const C_THIRD = '#3B82F6';
export const C_TARGET = T.er;

export const fmtNum = (v: number | null | undefined, digits = 0) =>
  v == null ? '-' : v.toLocaleString('ko-KR', { maximumFractionDigits: digits, minimumFractionDigits: digits });
/** 원 → 억원(소수 1~2자리) */
export const fmtEok = (won: number | null | undefined, digits = 1) => (won == null ? '-' : `${(won / 1e8).toFixed(digits)}억`);
/** 원 → 만원 */
export const fmtMan = (won: number | null | undefined) => (won == null ? '-' : `${fmtNum(Math.round(won / 1e4))}만`);
/** 큰 수를 만/억 단위로 — 축 라벨용 */
export const fmtCompact = (v: number) =>
  Math.abs(v) >= 1e8 ? `${(v / 1e8).toFixed(1)}억` : Math.abs(v) >= 1e4 ? `${fmtNum(v / 1e4)}만` : fmtNum(v);

/** 기간(1~N월) 안의 합 — null 은 0 */
export const sumRange = (arr: (number | null)[] | undefined, from: number, to: number) => {
  if (!arr) return 0;
  let s = 0;
  for (let m = from - 1; m <= to - 1; m++) s += arr[m] ?? 0;
  return s;
};
/** 기간 안의 평균(null·0 제외), 없으면 null */
export const avgRange = (arr: (number | null)[] | undefined, from: number, to: number) => {
  if (!arr) return null;
  let s = 0;
  let n = 0;
  for (let m = from - 1; m <= to - 1; m++) {
    const v = arr[m];
    if (v != null && v !== 0) { s += v; n++; }
  }
  return n ? Math.round((s / n) * 100) / 100 : null;
};

/** KPI 타일 — 숫자가 주인공. tone 은 목표 달성 여부 등 상태색. */
export function KpiTile({ label, value, unit, sub, tone, onClick, active }: {
  label: string; value: string; unit?: string; sub?: React.ReactNode;
  tone?: 'ok' | 'warn' | 'bad' | 'none'; onClick?: () => void; active?: boolean;
}) {
  const color = tone === 'ok' ? T.ok : tone === 'warn' ? T.wa : tone === 'bad' ? T.er : T.t1;
  return (
    <Card
      variant="borderless"
      hoverable={!!onClick}
      onClick={onClick}
      styles={{ body: { padding: '14px 18px' } }}
      style={{
        borderRadius: 12, height: '100%', cursor: onClick ? 'pointer' : 'default',
        border: `1px solid ${active ? T.primary : T.border2}`,
        boxShadow: active ? `0 0 0 2px ${T.primary}22` : undefined,
      }}
    >
      <Text style={{ fontSize: 12, color: T.t3 }}>{label}</Text>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
        <span className="tabular-nums" style={{ fontSize: 24, fontWeight: 700, color, lineHeight: 1.3 }}>{value}</span>
        {unit && <span style={{ fontSize: 12, color: T.t3 }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>{sub}</div>}
    </Card>
  );
}

export function ChartCard({ title, extra, height, children }: {
  title: React.ReactNode; extra?: React.ReactNode; height: number; children: React.ReactElement;
}) {
  return (
    <Card variant="borderless" styles={{ body: { padding: '14px 16px 6px' } }}
      style={{ borderRadius: 12, border: `1px solid ${T.border2}`, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 10, gap: 8 }}>
        <Text style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{title}</Text>
        {extra && <div style={{ marginLeft: 'auto', fontSize: 12, color: T.t3 }}>{extra}</div>}
      </div>
      <ResponsiveContainer width="100%" height={height}>{children}</ResponsiveContainer>
    </Card>
  );
}

export interface Series { key: string; name: string; color: string; values: (number | null)[] }

/** 월 데이터를 recharts 행으로 — 기간 밖·없는 달은 null 로 둬 막대가 비게 한다. */
export function monthRows(series: Series[], from = 1, to = 12) {
  return MONTHS.map((label, i) => {
    const row: Record<string, string | number | null> = { label };
    for (const s of series) row[s.key] = i + 1 >= from && i + 1 <= to ? s.values[i] ?? null : null;
    return row;
  });
}

function BoardTooltip({ active, payload, label, unit, digits }: {
  active?: boolean; payload?: { name?: string; value?: number | null; color?: string }[]; label?: string; unit: string; digits?: number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border1}`, borderRadius: 8,
      padding: '8px 10px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12,
    }}>
      <div style={{ color: T.t1, fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.t2 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, display: 'inline-block' }} />
          <span style={{ minWidth: 48 }}>{p.name}</span>
          <span className="tabular-nums" style={{ marginLeft: 'auto', color: T.t1 }}>
            {p.value == null ? '-' : `${fmtNum(p.value, digits ?? 0)}${unit}`}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * 월별 막대(여러 계열) — 목표선(target)과 함께. ResponsiveContainer 가 주는 width/height 를 그대로 넘긴다.
 * valueScale 로 값을 나눠 그린다(원 → 만원·억원).
 */
export function MonthlyBars({ series, unit, target, from = 1, to = 12, valueScale = 1, digits = 0, stacked, showLegend, ...size }: {
  series: Series[]; unit: string; target?: number | null; from?: number; to?: number; valueScale?: number; digits?: number;
  stacked?: boolean; showLegend?: boolean; width?: number; height?: number;
}) {
  const scaled = series.map((s) => ({ ...s, values: s.values.map((v) => (v == null ? null : v / valueScale)) }));
  const data = monthRows(scaled, from, to);
  return (
    <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%" {...size}>
      <CartesianGrid vertical={false} stroke={T.border2} />
      <XAxis dataKey="label" tick={{ fontSize: 11, fill: T.t3 }} axisLine={{ stroke: T.border1 }} tickLine={false} />
      <YAxis tick={{ fontSize: 11, fill: T.t3 }} axisLine={false} tickLine={false} width={44}
        tickFormatter={(v: number) => fmtNum(v, digits)} />
      <Tooltip content={<BoardTooltip unit={unit} digits={digits} />} cursor={{ fill: `${T.primary}11` }} />
      {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
      {target != null && target > 0 && (
        <ReferenceLine y={target} stroke={C_TARGET} strokeDasharray="4 3" label={{ value: `목표 ${fmtNum(target, digits)}`, position: 'insideTopRight', fontSize: 11, fill: C_TARGET }} />
      )}
      {scaled.map((s) => (
        <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[3, 3, 0, 0]} stackId={stacked ? 'a' : undefined} maxBarSize={28} />
      ))}
    </BarChart>
  );
}

/** 월별 선(TPI 같은 지수) — 목표선 포함. */
export function MonthlyLines({ series, unit, target, from = 1, to = 12, digits = 2, ...size }: {
  series: Series[]; unit: string; target?: number | null; from?: number; to?: number; digits?: number; width?: number; height?: number;
}) {
  const data = monthRows(series, from, to);
  const vals = series.flatMap((s) => s.values).filter((v): v is number => v != null);
  const lo = Math.min(...vals, target ?? Infinity);
  const hi = Math.max(...vals, target ?? -Infinity);
  const domain: [number, number] = vals.length ? [Math.floor((lo - 0.05) * 10) / 10, Math.ceil((hi + 0.05) * 10) / 10] : [0, 1];
  return (
    <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} {...size}>
      <CartesianGrid vertical={false} stroke={T.border2} />
      <XAxis dataKey="label" tick={{ fontSize: 11, fill: T.t3 }} axisLine={{ stroke: T.border1 }} tickLine={false} />
      <YAxis domain={domain} tick={{ fontSize: 11, fill: T.t3 }} axisLine={false} tickLine={false} width={44}
        tickFormatter={(v: number) => fmtNum(v, digits)} />
      <Tooltip content={<BoardTooltip unit={unit} digits={digits} />} />
      {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
      {target != null && target > 0 && (
        <ReferenceLine y={target} stroke={C_TARGET} strokeDasharray="4 3" label={{ value: `목표 ${fmtNum(target, digits)}`, position: 'insideTopRight', fontSize: 11, fill: C_TARGET }} />
      )}
      {series.map((s) => (
        <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
      ))}
    </LineChart>
  );
}

/** 기간 선택 — 시작월~종료월 + 프리셋(연간/상반기/하반기/집계완료). */
export function PeriodBar({ from, to, lastMonth, onChange }: {
  from: number; to: number; lastMonth: number; onChange: (from: number, to: number) => void;
}) {
  const opts = MONTHS.map((m, i) => ({ value: i + 1, label: m }));
  const presets: { label: string; from: number; to: number }[] = [
    { label: '연간', from: 1, to: 12 },
    { label: '상반기', from: 1, to: 6 },
    { label: '하반기', from: 7, to: 12 },
    ...(lastMonth > 0 ? [{ label: `집계완료(1~${lastMonth}월)`, from: 1, to: lastMonth }] : []),
  ];
  return (
    <Space wrap size={8}>
      <Select size="small" style={{ width: 80 }} value={from} options={opts} onChange={(v) => onChange(Math.min(v, to), Math.max(v, to))} />
      <span style={{ color: T.t3 }}>~</span>
      <Select size="small" style={{ width: 80 }} value={to} options={opts} onChange={(v) => onChange(Math.min(from, v), Math.max(from, v))} />
      {presets.map((p) => (
        <a key={p.label} onClick={() => onChange(p.from, p.to)}
          style={{ fontSize: 12, color: from === p.from && to === p.to ? T.primary : T.t3, fontWeight: from === p.from && to === p.to ? 600 : 400 }}>
          {p.label}
        </a>
      ))}
    </Space>
  );
}

/** 목표 대비 판정 — higherIsBetter 면 값 ≥ 목표, 아니면 값 ≤ 목표. 목표 없으면 none. */
export function toneFor(value: number | null, target: number | null | undefined, higherIsBetter: boolean): 'ok' | 'warn' | 'none' {
  if (value == null || target == null) return 'none';
  return (higherIsBetter ? value >= target : value <= target) ? 'ok' : 'warn';
}
