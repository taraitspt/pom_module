import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Col, Empty, Result, Row, Segmented, Select, Space, Spin, Table, Tabs, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import PageLayout from '@/components/layout/PageLayout';
import PageHeader from '@/components/layout/PageHeader';
import { getBoardPerf } from '@/api/boards.api';
import type { EquipmentPerf, PerfBoard, ProcessPerf, QualityIssue } from '@/types/boards';
import type { DashboardDef } from '@/pages/dashboards/dashboardRegistry';
import { T } from '@/theme/designTokens';
import MaintIssuePanel from './MaintIssuePanel';
import RecordPanel from './RecordPanel';
import PeoplePanel from './PeoplePanel';
import { SAFETY_ACCIDENT_FIELDS, SAFETY_ACTION_FIELDS, WORK_ITEM_FIELDS } from './recordConfigs';
import {
  C_PRIMARY, C_SECOND, C_THIRD, ChartCard, KpiTile, MonthlyBars, MonthlyLines, PeriodBar,
  avgRange, fmtEok, fmtNum, sumRange, toneFor, type Series,
} from './boardUi';

const { Text } = Typography;

/**
 * 생산운영팀·인쇄파트 현황판 (2차, React + ERP 조회). 원본 아티팩트의 탭 구성(종합·실적·품질·업무·설비·안전·인원)을 따른다.
 * 실적·품질은 서버 `/api/boards/{slug}/perf` 한 번으로 받고(ERP 10분 캐시), 업무·설비·안전·인원은 다음 단계(입력 테이블)에서 붙인다.
 * 인쇄파트는 같은 화면에 공정이 매엽·윤전만 내려오는 것뿐이다.
 */

type Metric = 'tpi' | 'quality' | 'cost' | 'production' | 'revenue';
const METRIC_LABEL: Record<Metric, string> = { tpi: 'TPI', quality: '품질 불량·클레임', cost: '품질 불량비용', production: '생산량', revenue: '생산매출' };

/** 연 종합 TPI 의 월값 — 모든 공정 설비의 월 TPI 평균(0 제외), ERP 생산지수보드의 '월별 종합 TPI' 와 같은 식. */
function overallTpiMonthly(processes: ProcessPerf[]): (number | null)[] {
  return Array.from({ length: 12 }, (_, m) => {
    const vals = processes.filter((p) => p.hasTpi).flatMap((p) => p.equipments.map((e) => e.tpiMonthly[m]))
      .filter((v): v is number => v != null && v !== 0);
    return vals.length ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 100) / 100 : null;
  });
}

const sumMonthly = (arrs: (number | null)[][]) =>
  Array.from({ length: 12 }, (_, m) => {
    let any = false; let s = 0;
    for (const a of arrs) { const v = a[m]; if (v != null) { any = true; s += v; } }
    return any ? s : null;
  });

const ProductionOpsBoard = ({ def }: { def: DashboardDef }) => {
  const thisYear = dayjs().year();
  const [year, setYear] = useState(thisYear);
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['board-perf', def.slug, year],
    queryFn: () => getBoardPerf(def.slug, year),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const status = (error as { response?: { status?: number } } | null)?.response?.status;

  return (
    <PageLayout>
      <PageHeader
        title={def.label}
        sub={data ? `ERP 기준 · ${data.lastMonth > 0 ? `${data.lastMonth}월까지 집계` : '집계 전'} · ${dayjs(data.generatedAt).format('MM-DD HH:mm')} 조회` : 'ERP 실적·품질 조회'}
        actions={(
          <Space>
            <Select size="small" value={year} style={{ width: 90 }}
              options={[thisYear - 1, thisYear, thisYear + 1].map((y) => ({ value: y, label: `${y}년` }))} onChange={setYear} />
            <Button size="small" icon={<ReloadOutlined />} loading={isFetching} onClick={() => getBoardPerf(def.slug, year, true).then(() => refetch())}>
              ERP 다시 읽기
            </Button>
          </Space>
        )}
      />
      {isLoading && (
        <div style={{ padding: 80, textAlign: 'center' }}>
          <Spin size="large" tip="ERP 실적·TPI·부적합을 집계하는 중… (첫 조회는 10초쯤 걸립니다)"><div style={{ height: 40 }} /></Spin>
        </div>
      )}
      {isError && (status === 403
        ? <Result status="403" title="볼 수 있는 권한이 없습니다" subTitle={`${def.label} 메뉴 권한은 관리자 > 권한 관리에서 켭니다.`} />
        : <Alert type="error" showIcon message={`${def.label} 데이터를 불러오지 못했습니다.`}
          description={(error as { response?: { data?: { message?: string } } } | null)?.response?.data?.message ?? '잠시 후 다시 시도해 주세요.'}
          action={<Button icon={<ReloadOutlined />} onClick={() => refetch()}>다시 시도</Button>} />)}
      {data && <BoardBody data={data} />}
    </PageLayout>
  );
};

function BoardBody({ data }: { data: PerfBoard }) {
  const writers = [data.slug];
  return (
    <Tabs
      defaultActiveKey="overview"
      items={[
        { key: 'overview', label: '종합', children: <OverviewTab data={data} /> },
        { key: 'perf', label: '실적', children: <PerfTab data={data} /> },
        { key: 'quality', label: '품질', children: <QualityTab data={data} /> },
        { key: 'work', label: '업무·과제', children: <RecordPanel kind="work-items" title="파트 업무·과제" fields={WORK_ITEM_FIELDS} fixed={{ boardSlug: data.slug }} dateLabel="시작일" statusField="status" writerSlugs={writers} defaultValues={{ status: 'TODO' }} /> },
        { key: 'equip', label: '설비', children: <MaintIssuePanel compact processes={data.slug === 'print-part' ? ['sheet', 'web'] : undefined} /> },
        {
          key: 'safety', label: '안전', children: (
            <div>
              <RecordPanel kind="safety-accidents" title="안전사고 사례" fields={SAFETY_ACCIDENT_FIELDS} dateLabel="발생일" statusField="status" writerSlugs={writers} defaultValues={{ status: 'TREATING' }} compact />
              <div style={{ height: 16 }} />
              <RecordPanel kind="safety-actions" title="안전 조치사항" fields={SAFETY_ACTION_FIELDS} dateLabel="조치일" statusField="status" writerSlugs={writers} defaultValues={{ status: 'PLANNED' }} compact />
            </div>
          ),
        },
        { key: 'people', label: '인원', children: <PeoplePanel /> },
      ]}
    />
  );
}

// ------------------------------------------------------------------ 종합

function OverviewTab({ data }: { data: PerfBoard }) {
  const [metric, setMetric] = useState<Metric>('tpi');
  const last = data.lastMonth || 12;
  const target = (m: string, scope = 'ALL') => data.targets.find((t) => t.metric === m && t.scope === scope)?.value ?? null;
  const tpiM = useMemo(() => overallTpiMonthly(data.processes), [data]);
  const tpiYear = avgRange(tpiM, 1, last);
  const qCnt = data.processes.reduce((s, p) => s + sumRange(p.quality, 1, last), 0);
  const qCost = data.processes.reduce((s, p) => s + sumRange(p.cost, 1, last), 0);
  const printP = data.processes.filter((p) => p.code === 'sheet' || p.code === 'web');
  const bindP = data.processes.filter((p) => p.code === 'saddle' || p.code === 'perfect');
  const prodPrint = printP.reduce((s, p) => s + sumRange(p.production, 1, last), 0);
  const prodBind = bindP.reduce((s, p) => s + sumRange(p.production, 1, last), 0);
  const revenue = data.processes.reduce((s, p) => s + sumRange(p.revenue, 1, last), 0);
  const qualityM = sumMonthly(data.processes.map((p) => p.quality));
  const costM = sumMonthly(data.processes.map((p) => p.cost));
  const revenueM = sumMonthly(data.processes.map((p) => p.revenue));
  const printM = sumMonthly(printP.map((p) => p.production));
  const bindM = sumMonthly(bindP.map((p) => p.production));
  const tpiTarget = target('TPI');

  const issues = [...data.qualityIssues].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

  return (
    <div>
      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12} lg={Math.floor(24 / 5)}>
          <KpiTile label="종합 TPI" value={tpiYear == null ? '-' : tpiYear.toFixed(2)} active={metric === 'tpi'} onClick={() => setMetric('tpi')}
            tone={toneFor(tpiYear, tpiTarget, true)} sub={`연목표 ${tpiTarget ?? '-'} · 1~${last}월 평균`} />
        </Col>
        <Col xs={24} sm={12} lg={5}>
          <KpiTile label="품질 불량·클레임" value={fmtNum(qCnt)} unit="건" active={metric === 'quality'} onClick={() => setMetric('quality')}
            tone={toneFor(qCnt, target('QUALITY_COUNT'), false)} sub={`1~${last}월 누계 · 목표 ${target('QUALITY_COUNT') ?? '-'}건`} />
        </Col>
        <Col xs={24} sm={12} lg={5}>
          <KpiTile label="품질 불량비용" value={fmtNum(Math.round(qCost / 1e4))} unit="만원" active={metric === 'cost'} onClick={() => setMetric('cost')}
            tone={toneFor(qCost, target('QUALITY_COST'), false)} sub={`${fmtNum(qCost)}원`} />
        </Col>
        <Col xs={24} sm={12} lg={5}>
          <KpiTile label="생산량" active={metric === 'production'} onClick={() => setMetric('production')}
            value={printP.length ? `${fmtNum(prodPrint / 1e4, 0)}` : bindP.length ? fmtNum(prodBind / 1e4, 0) : '-'}
            unit={printP.length ? '만통' : '만부'}
            sub={printP.length && bindP.length ? `인쇄 ${fmtNum(prodPrint / 1e4, 0)}만통 · 제본 ${fmtNum(prodBind / 1e4, 0)}만부` : `1~${last}월 누계`} />
        </Col>
        <Col xs={24} sm={12} lg={5}>
          <KpiTile label="생산매출" value={fmtEok(revenue)} active={metric === 'revenue'} onClick={() => setMetric('revenue')}
            sub={`사내금액 · 1~${last}월 누계`} />
        </Col>
      </Row>

      <div style={{ marginTop: 12 }}>
        <ChartCard title={`${METRIC_LABEL[metric]} 추이 (월별)`} height={240}
          extra={metric === 'tpi' ? '설비 월 TPI 평균 · ERP 생산지수보드' : metric === 'production' ? '인쇄 통 · 제본 부' : undefined}>
          {metric === 'tpi'
            ? <MonthlyLines series={[{ key: 'tpi', name: 'TPI', color: C_PRIMARY, values: tpiM }]} unit="" target={tpiTarget} />
            : metric === 'production'
              ? <MonthlyBars series={[
                ...(printP.length ? [{ key: 'print', name: '인쇄(만통)', color: C_PRIMARY, values: printM }] : []),
                ...(bindP.length ? [{ key: 'bind', name: '제본(만부)', color: C_SECOND, values: bindM }] : []),
              ]} unit="만" valueScale={1e4} showLegend />
              : metric === 'revenue'
                ? <MonthlyBars series={[{ key: 'rev', name: '생산매출', color: C_PRIMARY, values: revenueM }]} unit="억" valueScale={1e8} digits={1} />
                : metric === 'cost'
                  ? <MonthlyBars series={[{ key: 'cost', name: '품질비용', color: C_PRIMARY, values: costM }]} unit="만원" valueScale={1e4} />
                  : <MonthlyBars series={[{ key: 'q', name: '품질 건수', color: C_PRIMARY, values: qualityM }]} unit="건" />}
        </ChartCard>
      </div>

      <div style={{ marginTop: 12 }}>
        <QualityTable issues={issues} title="품질 이슈 (최근 10건)" compact />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ 실적

function PerfTab({ data }: { data: PerfBoard }) {
  const last = data.lastMonth || 12;
  const [range, setRange] = useState<[number, number]>([1, last]);
  const [proc, setProc] = useState<string>('ALL');
  const [from, to] = range;
  const target = (m: string, scope = 'ALL') => data.targets.find((t) => t.metric === m && t.scope === scope)?.value ?? null;

  const selected = data.processes.filter((p) => proc === 'ALL' || p.code === proc);
  const withTpi = selected.filter((p) => p.hasTpi);
  const tpiM: (number | null)[] = proc === 'ALL'
    ? overallTpiMonthly(data.processes)
    : (selected[0]?.tpi ?? Array(12).fill(null));
  const tpiAvg = avgRange(tpiM, from, to);
  const qCnt = selected.reduce((s, p) => s + sumRange(p.quality, from, to), 0);
  const qCost = selected.reduce((s, p) => s + sumRange(p.cost, from, to), 0);
  const prod = selected.reduce((s, p) => s + sumRange(p.production, from, to), 0);
  const rev = selected.reduce((s, p) => s + sumRange(p.revenue, from, to), 0);
  const tpiTarget = target('TPI', proc === 'ALL' ? 'ALL' : proc) ?? target('TPI');

  // 생산량 차트 계열 — 전체면 인쇄/제본, 코팅이면 코팅/톰슨, 그 외 공정 하나
  const prodSeries: Series[] = (() => {
    if (proc === 'ALL') {
      const printP = data.processes.filter((p) => p.code === 'sheet' || p.code === 'web');
      const bindP = data.processes.filter((p) => p.code === 'saddle' || p.code === 'perfect');
      return [
        ...(printP.length ? [{ key: 'print', name: '인쇄(통)', color: C_PRIMARY, values: sumMonthly(printP.map((p) => p.production)) }] : []),
        ...(bindP.length ? [{ key: 'bind', name: '제본(부)', color: C_SECOND, values: sumMonthly(bindP.map((p) => p.production)) }] : []),
      ];
    }
    const p = selected[0];
    if (!p) return [];
    const splits = Object.entries(p.splits);
    if (splits.length) {
      return splits.map(([k, s], i) => ({ key: k, name: `${s.name}(${s.unit})`, color: i === 0 ? C_PRIMARY : C_SECOND, values: s.production }));
    }
    return [{ key: p.code, name: `${p.name}(${p.unit})`, color: C_PRIMARY, values: p.production }];
  })();
  const revSeries: Series[] = proc === 'ALL'
    ? [{ key: 'rev', name: '생산매출', color: C_PRIMARY, values: sumMonthly(data.processes.map((p) => p.revenue)) }]
    : Object.keys(selected[0]?.splits ?? {}).length
      ? Object.entries(selected[0].splits).map(([k, s], i) => ({ key: k, name: s.name, color: i === 0 ? C_PRIMARY : C_SECOND, values: s.revenue }))
      : [{ key: 'rev', name: '생산매출', color: C_PRIMARY, values: selected[0]?.revenue ?? [] }];
  const unitProd = proc === 'ALL' ? '' : selected[0]?.unit ?? '';

  return (
    <div>
      <Space wrap style={{ marginBottom: 12 }} size={16}>
        <Segmented value={proc} onChange={(v) => setProc(String(v))}
          options={[{ label: '전체', value: 'ALL' }, ...data.processes.map((p) => ({ label: p.name, value: p.code }))]} />
        <PeriodBar from={from} to={to} lastMonth={data.lastMonth} onChange={(f, t) => setRange([f, t])} />
      </Space>

      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12} lg={5}>
          <KpiTile label={`${proc === 'ALL' ? '종합' : selected[0]?.name} TPI`} value={tpiAvg == null ? (withTpi.length ? '-' : '해당 없음') : tpiAvg.toFixed(2)}
            tone={toneFor(tpiAvg, tpiTarget, true)} sub={`목표 ${tpiTarget ?? '-'} · ${from}~${to}월 평균`} />
        </Col>
        <Col xs={24} sm={12} lg={5}>
          <KpiTile label="품질 불량·클레임" value={fmtNum(qCnt)} unit="건" tone={toneFor(qCnt, target('QUALITY_COUNT'), false)} sub={`${from}~${to}월 누계`} />
        </Col>
        <Col xs={24} sm={12} lg={5}>
          <KpiTile label="품질 불량비용" value={fmtNum(Math.round(qCost / 1e4))} unit="만원" tone={toneFor(qCost, target('QUALITY_COST'), false)} sub={`${fmtNum(qCost)}원`} />
        </Col>
        <Col xs={24} sm={12} lg={5}>
          <KpiTile label="생산량" value={proc === 'ALL' ? fmtNum(prod / 1e4, 0) : fmtNum(prod)} unit={proc === 'ALL' ? '만 (통+부 합)' : unitProd}
            sub={`${from}~${to}월 누계`} />
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <KpiTile label="생산매출" value={fmtEok(rev, 2)} sub="사내금액" />
        </Col>
      </Row>

      <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
        <Col xs={24} lg={8}>
          <ChartCard title="TPI" height={200} extra={withTpi.length ? '목표선 = 연목표' : 'TPI 없는 공정'}>
            {withTpi.length
              ? <MonthlyLines series={[{ key: 'tpi', name: 'TPI', color: C_PRIMARY, values: tpiM }]} unit="" target={tpiTarget} from={from} to={to} />
              : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ERP 생산지수보드에 없는 공정" />}
          </ChartCard>
        </Col>
        <Col xs={24} lg={8}>
          <ChartCard title="품질 건수" height={200}>
            <MonthlyBars series={[{ key: 'q', name: '건수', color: C_PRIMARY, values: sumMonthly(selected.map((p) => p.quality)) }]} unit="건" from={from} to={to} />
          </ChartCard>
        </Col>
        <Col xs={24} lg={8}>
          <ChartCard title="품질비용" height={200}>
            <MonthlyBars series={[{ key: 'c', name: '비용', color: C_PRIMARY, values: sumMonthly(selected.map((p) => p.cost)) }]} unit="만원" valueScale={1e4} from={from} to={to} />
          </ChartCard>
        </Col>
        <Col xs={24} lg={12}>
          <ChartCard title="생산량" height={220} extra={prodSeries.map((s) => s.name).join(' · ')}>
            <MonthlyBars series={prodSeries} unit="" valueScale={1} from={from} to={to} showLegend={prodSeries.length > 1} />
          </ChartCard>
        </Col>
        <Col xs={24} lg={12}>
          <ChartCard title="생산매출" height={220} extra="억원">
            <MonthlyBars series={revSeries} unit="억" valueScale={1e8} digits={1} from={from} to={to} showLegend={revSeries.length > 1} />
          </ChartCard>
        </Col>
      </Row>

      <div style={{ marginTop: 12 }}>
        <EquipmentTable processes={selected} from={from} to={to} />
      </div>
    </div>
  );
}

function EquipmentTable({ processes, from, to }: { processes: ProcessPerf[]; from: number; to: number }) {
  type Row = EquipmentPerf & { processName: string; unit: string; hasTpi: boolean; pProd: number; pRev: number; pTpi: number | null };
  const rows: Row[] = processes.flatMap((p) => p.equipments.map((e) => ({
    ...e, processName: p.name, unit: p.splits[e.splitCode ?? '']?.unit ?? p.unit, hasTpi: p.hasTpi,
    pProd: sumRange(e.productionMonthly, from, to), pRev: sumRange(e.revenueMonthly, from, to), pTpi: avgRange(e.tpiMonthly, from, to),
  })));
  const columns: ColumnsType<Row> = [
    { title: '공정', dataIndex: 'processName', width: 90 },
    { title: '설비', dataIndex: 'name', width: 140 },
    { title: `생산량 (${from}~${to}월)`, dataIndex: 'pProd', align: 'right', width: 150, render: (v: number, r) => <span className="tabular-nums">{fmtNum(v)} <Text type="secondary">{r.unit}</Text></span>, sorter: (a, b) => a.pProd - b.pProd },
    { title: '생산매출', dataIndex: 'pRev', align: 'right', width: 150, render: (v: number) => <span className="tabular-nums">{fmtNum(v)}원</span>, sorter: (a, b) => a.pRev - b.pRev },
    { title: 'TPI (평균)', dataIndex: 'pTpi', align: 'right', width: 100, render: (v: number | null, r) => (r.hasTpi ? <span className="tabular-nums">{v == null ? '-' : v.toFixed(2)}</span> : <Text type="secondary">-</Text>) },
    { title: '품질건수', dataIndex: 'quality', align: 'right', width: 90, render: (v: number) => fmtNum(v) },
    { title: '품질비용', dataIndex: 'qcost', align: 'right', width: 120, render: (v: number) => <span className="tabular-nums">{fmtNum(v)}원</span> },
  ];
  const totalProd = rows.reduce((s, r) => s + r.pProd, 0);
  const totalRev = rows.reduce((s, r) => s + r.pRev, 0);
  return (
    <Table<Row>
      size="small" rowKey="eqpCd" columns={columns} dataSource={rows} pagination={false}
      title={() => <Text strong>설비별 실적 ({from}~{to}월 누계) · 품질 건수·비용은 연간</Text>}
      summary={() => (
        <Table.Summary.Row>
          <Table.Summary.Cell index={0} colSpan={2}><Text strong>합계</Text></Table.Summary.Cell>
          <Table.Summary.Cell index={2} align="right"><Text strong className="tabular-nums">{fmtNum(totalProd)}</Text></Table.Summary.Cell>
          <Table.Summary.Cell index={3} align="right"><Text strong className="tabular-nums">{fmtNum(totalRev)}원</Text></Table.Summary.Cell>
          <Table.Summary.Cell index={4} />
          <Table.Summary.Cell index={5} align="right"><Text strong>{fmtNum(rows.reduce((s, r) => s + r.quality, 0))}</Text></Table.Summary.Cell>
          <Table.Summary.Cell index={6} align="right"><Text strong className="tabular-nums">{fmtNum(rows.reduce((s, r) => s + r.qcost, 0))}원</Text></Table.Summary.Cell>
        </Table.Summary.Row>
      )}
    />
  );
}

// ------------------------------------------------------------------ 품질

function QualityTab({ data }: { data: PerfBoard }) {
  const last = data.lastMonth || 12;
  const [range, setRange] = useState<[number, number]>([1, last]);
  const [proc, setProc] = useState<string>('ALL');
  const [from, to] = range;
  const inRange = (i: QualityIssue) => { const m = Number(i.month.slice(5, 7)); return m >= from && m <= to; };
  const issues = data.qualityIssues.filter(inRange).filter((i) => proc === 'ALL' || i.processCode === proc);
  const allInRange = data.qualityIssues.filter(inRange);
  const total = issues.reduce((s, i) => s + i.procAmt, 0);
  const byProc = data.processes.map((p) => ({
    code: p.code, name: p.name,
    cnt: allInRange.filter((i) => i.processCode === p.code).length,
    cost: allInRange.filter((i) => i.processCode === p.code).reduce((s, i) => s + i.procAmt, 0),
  }));
  const etc = allInRange.filter((i) => !data.processes.some((p) => p.code === i.processCode));
  const cntM = Array.from({ length: 12 }, (_, m) => issues.filter((i) => Number(i.month.slice(5, 7)) === m + 1).length);
  const costM = Array.from({ length: 12 }, (_, m) => issues.filter((i) => Number(i.month.slice(5, 7)) === m + 1).reduce((s, i) => s + i.procAmt, 0));
  const peak = cntM.reduce((best, v, i) => (v > best.v ? { v, i } : best), { v: 0, i: -1 });
  const lastMonthNew = data.qualityIssues.filter((i) => Number(i.month.slice(5, 7)) === last).length;

  return (
    <div>
      <Space wrap style={{ marginBottom: 12 }} size={16}>
        <PeriodBar from={from} to={to} lastMonth={data.lastMonth} onChange={(f, t) => setRange([f, t])} />
      </Space>
      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12} lg={6}><KpiTile label="품질 이슈" value={fmtNum(issues.length)} unit="건" sub={`${from}~${to}월${proc !== 'ALL' ? ` · ${data.processes.find((p) => p.code === proc)?.name}` : ''}`} /></Col>
        <Col xs={24} sm={12} lg={6}><KpiTile label="불량·클레임 누계" value={fmtNum(allInRange.length)} unit="건" sub="전 공정" /></Col>
        <Col xs={24} sm={12} lg={6}><KpiTile label="불량비용 누계" value={fmtNum(Math.round(total / 1e4))} unit="만원" sub={`${fmtNum(total)}원`} /></Col>
        <Col xs={24} sm={12} lg={6}><KpiTile label={`최근 월(${last}월) 신규`} value={fmtNum(lastMonthNew)} unit="건" sub="접수일 기준" /></Col>
      </Row>
      <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
        <Col xs={24} lg={12}>
          <ChartCard title="월별 품질 건수" height={220} extra={peak.i >= 0 && peak.v > 0 ? `최다 ${peak.i + 1}월 ${peak.v}건` : undefined}>
            <MonthlyBars series={[{ key: 'c', name: '건수', color: C_PRIMARY, values: cntM }]} unit="건" from={from} to={to} />
          </ChartCard>
        </Col>
        <Col xs={24} lg={12}>
          <ChartCard title="월별 품질비용" height={220} extra="만원">
            <MonthlyBars series={[{ key: 'c', name: '비용', color: C_THIRD, values: costM }]} unit="만원" valueScale={1e4} from={from} to={to} />
          </ChartCard>
        </Col>
      </Row>
      <div style={{ marginTop: 12, marginBottom: 12 }}>
        <Space wrap size={8}>
          <Tag.CheckableTag checked={proc === 'ALL'} onChange={() => setProc('ALL')} style={{ padding: '4px 10px', border: `1px solid ${T.border2}` }}>
            전체 {allInRange.length}건 · {fmtNum(Math.round(allInRange.reduce((s, i) => s + i.procAmt, 0) / 1e4))}만원
          </Tag.CheckableTag>
          {byProc.map((p) => (
            <Tag.CheckableTag key={p.code} checked={proc === p.code} onChange={() => setProc(proc === p.code ? 'ALL' : p.code)} style={{ padding: '4px 10px', border: `1px solid ${T.border2}` }}>
              {p.name} {p.cnt}건 · {fmtNum(Math.round(p.cost / 1e4))}만원
            </Tag.CheckableTag>
          ))}
          {etc.length > 0 && <Text type="secondary" style={{ fontSize: 12 }}>기타 공정 {etc.length}건</Text>}
        </Space>
      </div>
      <QualityTable issues={[...issues].sort((a, b) => b.date.localeCompare(a.date))} title={`품질 이슈 상세 (${issues.length}건)`} />
    </div>
  );
}

function QualityTable({ issues, title, compact }: { issues: QualityIssue[]; title: string; compact?: boolean }) {
  const columns: ColumnsType<QualityIssue> = [
    { title: '접수일', dataIndex: 'date', width: 100 },
    { title: '공정', dataIndex: 'processName', width: 80 },
    { title: '설비', dataIndex: 'eqpNm', width: 110, render: (v: string) => v || '-' },
    { title: '접수유형', dataIndex: 'acptTpNm', width: 100, render: (v: string) => v || '-' },
    { title: '부적합', dataIndex: 'nstbDcNm', width: 100, render: (v: string) => v || '-' },
    { title: '주문·제품', dataIndex: 'orderNm', ellipsis: true, render: (v: string, r) => v || r.title || '-' },
    ...(compact ? [] : [{ title: '거래처', dataIndex: 'partnerNm', width: 140, ellipsis: true } as ColumnsType<QualityIssue>[number]]),
    { title: '내용', dataIndex: 'content', ellipsis: true, render: (v: string) => v || '-' },
    { title: '담당', dataIndex: 'personNm', width: 80 },
    { title: '품질비용', dataIndex: 'procAmt', align: 'right', width: 110, render: (v: number) => <span className="tabular-nums">{fmtNum(v)}원</span> },
  ];
  return (
    <Table<QualityIssue>
      size="small" rowKey="nstbNo" columns={columns} dataSource={issues}
      pagination={compact ? false : { pageSize: 20, showSizeChanger: false }}
      title={() => <Text strong>{title}</Text>}
      expandable={compact ? undefined : {
        expandedRowRender: (r) => (
          <div style={{ fontSize: 12, color: T.t2, whiteSpace: 'pre-wrap' }}>
            <div><Text strong>주문</Text> {r.orderNo} {r.orderNm}</div>
            <div><Text strong>책임부서</Text> {r.deptNm} · <Text strong>담당</Text> {r.personNm}</div>
            <div style={{ marginTop: 4 }}>{r.content || '(내용 없음)'}</div>
          </div>
        ),
      }}
    />
  );
}

export default ProductionOpsBoard;
