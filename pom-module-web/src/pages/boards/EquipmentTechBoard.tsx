import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Col, Empty, Row, Select, Space, Table, Tabs, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import PageLayout from '@/components/layout/PageLayout';
import PageHeader from '@/components/layout/PageHeader';
import { listMaintIssues } from '@/api/maint.api';
import { getBoardTargets, listRecords, type RecordRow } from '@/api/records.api';
import type { DashboardDef } from '@/pages/dashboards/dashboardRegistry';
import { T } from '@/theme/designTokens';
import MaintIssuePanel from './MaintIssuePanel';
import RecordPanel from './RecordPanel';
import ReportPanel from './ReportPanel';
import { C_PRIMARY, C_SECOND, C_THIRD, ChartCard, KpiTile, MonthlyBars, fmtNum, toneFor } from './boardUi';
import { MAINT_COST_FIELDS, PROJECT_FIELDS, PROJECT_LOG_FIELDS, S3S_FIELDS } from './recordConfigs';

const { Text } = Typography;
const SLUG = 'equipment-tech';

/**
 * 설비기술 대시보드 (React + POM 입력 테이블). ERP 에는 설비 정비·구입수리 데이터가 없어 전부 직접 입력이다(빈 테이블로 시작).
 * 정비현황 = board_maint_issue, 구입수리 = board_maint_cost, 3정5S = board_s3s_activity, 보고서 = board_report_doc, 프로젝트 = board_project(+log).
 * 성과관리는 입력값으로 계산: 3정5S 달성률(목표 board_kpi_target S3S), 계획정비 비율(계획/(계획+긴급) 시간).
 */
const EquipmentTechBoard = ({ def }: { def: DashboardDef }) => (
  <PageLayout>
    <PageHeader title={def.label} sub="정비·구입수리·3정5S·보고서·프로젝트는 POM 입력 · ERP 데이터 없음" />
    <Tabs
      defaultActiveKey="summary"
      items={[
        { key: 'summary', label: '대시보드', children: <SummaryTab /> },
        { key: 'purchase', label: '구입수리', children: <PurchaseTab /> },
        { key: 'maint', label: '정비현황', children: <MaintIssuePanel /> },
        { key: 'report', label: '보고서', children: <ReportPanel boardSlug={SLUG} writerSlugs={[SLUG]} /> },
        { key: 's3s', label: '3정5S', children: <S3sTab /> },
        { key: 'project', label: '프로젝트', children: <ProjectTab /> },
      ]}
    />
  </PageLayout>
);

function useYearCosts(year: number) {
  return useQuery({ queryKey: ['records', 'maint-costs', year], queryFn: () => listRecords<RecordRow>('maint-costs', { from: `${year}-01-01`, to: `${year}-12-31` }), staleTime: 60 * 1000 });
}
function useYearS3s(year: number) {
  return useQuery({ queryKey: ['records', 's3s-activities', year], queryFn: () => listRecords<RecordRow>('s3s-activities', { from: `${year}-01-01`, to: `${year}-12-31` }), staleTime: 60 * 1000 });
}
const monthOf = (d: unknown) => Number(String(d ?? '').slice(5, 7)) - 1;

function SummaryTab() {
  const year = dayjs().year();
  const weekAgo = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
  const { data: open } = useQuery({ queryKey: ['maint-issues', { statuses: ['SCHEDULED', 'PROGRESS', 'HOLD'] }], queryFn: () => listMaintIssues({ statuses: ['SCHEDULED', 'PROGRESS', 'HOLD'] }), staleTime: 60 * 1000 });
  const { data: doneWeek } = useQuery({ queryKey: ['maint-issues', { statuses: ['DONE'], from: weekAgo }], queryFn: () => listMaintIssues({ statuses: ['DONE'], from: weekAgo }), staleTime: 60 * 1000 });
  const { data: costs } = useYearCosts(year);
  const { data: s3s } = useYearS3s(year);
  const { data: targets } = useQuery({ queryKey: ['board-targets', SLUG, year], queryFn: () => getBoardTargets(SLUG, year), staleTime: 5 * 60 * 1000, retry: false });
  const s3sTarget = targets?.find((t) => t.metric === 'S3S')?.value ?? 48;
  const planTarget = targets?.find((t) => t.metric === 'PLANNED_MAINT_RATE')?.value ?? 70;
  const c = open?.statusCounts;
  const items = costs?.items ?? [];
  const sum = (type: string) => items.filter((r) => r.costType === type).reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const planH = items.filter((r) => r.maintType === 'PLANNED').reduce((s, r) => s + Number(r.hours ?? 0), 0);
  const urgH = items.filter((r) => r.maintType === 'URGENT').reduce((s, r) => s + Number(r.hours ?? 0), 0);
  const planRate = planH + urgH > 0 ? Math.round((planH / (planH + urgH)) * 1000) / 10 : null;
  const s3sCnt = s3s?.total ?? 0;
  const s3sRate = Math.round((s3sCnt / s3sTarget) * 1000) / 10;
  return (
    <div>
      <Row gutter={[12, 12]}>
        <Col xs={12} md={6}><KpiTile label="예정 정비" value={fmtNum(c?.SCHEDULED ?? 0)} unit="건" /></Col>
        <Col xs={12} md={6}><KpiTile label="진행중" value={fmtNum(c?.PROGRESS ?? 0)} unit="건" tone="warn" /></Col>
        <Col xs={12} md={6}><KpiTile label="보류" value={fmtNum(c?.HOLD ?? 0)} unit="건" tone="bad" /></Col>
        <Col xs={12} md={6}><KpiTile label="최근 7일 완료" value={fmtNum(doneWeek?.total ?? 0)} unit="건" tone="ok" /></Col>
        <Col xs={12} md={6}><KpiTile label={`${year} 구입·수리 비용`} value={fmtNum(Math.round(items.reduce((s, r) => s + Number(r.amount ?? 0), 0) / 1e4))} unit="만원" sub={`구입 ${fmtNum(Math.round(sum('PURCHASE') / 1e4))} · 부품수리 ${fmtNum(Math.round(sum('PART_REPAIR') / 1e4))} · 수리 ${fmtNum(Math.round(sum('REPAIR') / 1e4))}`} /></Col>
        <Col xs={12} md={6}><KpiTile label="계획정비 비율" value={planRate == null ? '-' : String(planRate)} unit="%" tone={toneFor(planRate, planTarget, true)} sub={`계획 ${planH}h · 긴급 ${urgH}h · 목표 ${planTarget}%`} /></Col>
        <Col xs={12} md={6}><KpiTile label="3정5S 누적" value={fmtNum(s3sCnt)} unit="건" tone={toneFor(s3sCnt, s3sTarget, true)} sub={`연간 목표 ${s3sTarget}건 · 달성률 ${s3sRate}%`} /></Col>
        <Col xs={12} md={6}><KpiTile label="부품 리스트(EAM)" value="-" sub="출처 없음 — EAM 연동 전" /></Col>
      </Row>
      {items.length === 0 && s3sCnt === 0 && (c?.SCHEDULED ?? 0) + (c?.PROGRESS ?? 0) + (c?.HOLD ?? 0) === 0 && (
        <Empty description="아직 입력된 데이터가 없습니다. 정비현황·구입수리·3정5S 탭에서 등록하면 여기에 집계됩니다." style={{ padding: 40 }} />
      )}
    </div>
  );
}

function PurchaseTab() {
  const [year, setYear] = useState(dayjs().year());
  const { data } = useYearCosts(year);
  const items = data?.items ?? [];
  const series = (type: string, name: string, color: string) => ({
    key: type, name, color, values: Array.from({ length: 12 }, (_, m) => items.filter((r) => r.costType === type && monthOf(r.costDate) === m).reduce((s, r) => s + Number(r.amount ?? 0), 0)),
  });
  const byProc = useMemo(() => {
    const map = new Map<string, { purchase: number; part: number; repair: number; n: number }>();
    for (const r of items) {
      const k = String(r.processCd ?? 'etc');
      const a = map.get(k) ?? { purchase: 0, part: 0, repair: 0, n: 0 };
      const amt = Number(r.amount ?? 0);
      if (r.costType === 'PURCHASE') a.purchase += amt; else if (r.costType === 'PART_REPAIR') a.part += amt; else a.repair += amt;
      a.n++;
      map.set(k, a);
    }
    return Array.from(map, ([proc, v]) => ({ proc, ...v, total: v.purchase + v.part + v.repair })).sort((a, b) => b.total - a.total);
  }, [items]);
  const procName = (c: string) => ({ plate: '제판', sheet: '매엽', web: '윤전', saddle: '중철', perfect: '무선', coating: '코팅·톰슨', fold: '접지', utility: '유틸리티', etc: '기타' } as Record<string, string>)[c] ?? c;
  const cols: ColumnsType<typeof byProc[number]> = [
    { title: '공정', dataIndex: 'proc', render: (v: string) => procName(v) },
    { title: '구입', dataIndex: 'purchase', align: 'right', render: (v: number) => `${fmtNum(v)}원` },
    { title: '부품수리', dataIndex: 'part', align: 'right', render: (v: number) => `${fmtNum(v)}원` },
    { title: '수리', dataIndex: 'repair', align: 'right', render: (v: number) => `${fmtNum(v)}원` },
    { title: '합계', dataIndex: 'total', align: 'right', render: (v: number) => <Text strong className="tabular-nums">{fmtNum(v)}원</Text> },
    { title: '건수', dataIndex: 'n', align: 'right', width: 70 },
  ];
  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Select size="small" value={year} onChange={setYear} options={[year - 1, year, year + 1].map((y) => ({ value: y, label: `${y}년` }))} />
        <Text type="secondary" style={{ fontSize: 12 }}>월별 구입·부품수리·수리 비용(입력 기준)</Text>
      </Space>
      <Row gutter={[12, 12]}>
        <Col xs={24} lg={14}>
          <ChartCard title="구입·수리 월별 현황" height={240} extra="만원">
            <MonthlyBars series={[series('PURCHASE', '구입', C_PRIMARY), series('PART_REPAIR', '부품수리', C_THIRD), series('REPAIR', '수리', C_SECOND)]} unit="만원" valueScale={1e4} stacked showLegend />
          </ChartCard>
        </Col>
        <Col xs={24} lg={10}>
          <Table size="small" rowKey="proc" columns={cols} dataSource={byProc} pagination={false} title={() => <Text strong>공정별 ({year})</Text>} locale={{ emptyText: '입력된 비용이 없습니다.' }} />
        </Col>
      </Row>
      <div style={{ marginTop: 12 }}>
        <RecordPanel kind="maint-costs" title="구입·수리 내역" fields={MAINT_COST_FIELDS} dateLabel="일자" statusField="costType" writerSlugs={[SLUG]} defaultValues={{ costType: 'PURCHASE' }} />
      </div>
    </div>
  );
}

function S3sTab() {
  const year = dayjs().year();
  const { data } = useYearS3s(year);
  const { data: targets } = useQuery({ queryKey: ['board-targets', SLUG, year], queryFn: () => getBoardTargets(SLUG, year), staleTime: 5 * 60 * 1000, retry: false });
  const target = targets?.find((t) => t.metric === 'S3S')?.value ?? 48;
  const items = data?.items ?? [];
  const monthly = Array.from({ length: 12 }, (_, m) => items.filter((r) => monthOf(r.activityDate) === m).length);
  return (
    <div>
      <Row gutter={[12, 12]}>
        <Col xs={8}><KpiTile label="연간 목표" value={fmtNum(target)} unit="건" sub="board_kpi_target S3S" /></Col>
        <Col xs={8}><KpiTile label="누적 실적" value={fmtNum(items.length)} unit="건" tone={toneFor(items.length, target, true)} /></Col>
        <Col xs={8}><KpiTile label="달성률" value={String(Math.round((items.length / target) * 1000) / 10)} unit="%" /></Col>
        <Col span={24}>
          <ChartCard title="월별 3정5S 활동" height={200} extra={`월 목표 ${Math.round(target / 12 * 10) / 10}건`}>
            <MonthlyBars series={[{ key: 's', name: '건수', color: C_PRIMARY, values: monthly }]} unit="건" target={target / 12} />
          </ChartCard>
        </Col>
      </Row>
      <div style={{ marginTop: 12 }}>
        <RecordPanel kind="s3s-activities" title="3정5S 활동 내역" fields={S3S_FIELDS} dateLabel="완료일" writerSlugs={[SLUG]} />
      </div>
    </div>
  );
}

function ProjectTab() {
  const [selected, setSelected] = useState<RecordRow | null>(null);
  const { data } = useQuery({ queryKey: ['records', 'projects', SLUG], queryFn: () => listRecords<RecordRow>('projects', { boardSlug: SLUG }), staleTime: 30 * 1000 });
  return (
    <div>
      <RecordPanel kind="projects" title="프로젝트" fields={PROJECT_FIELDS} fixed={{ boardSlug: SLUG }} dateLabel="시작일" statusField="status" writerSlugs={[SLUG]} defaultValues={{ status: 'PLANNED' }} compact
        extra={<Select size="small" allowClear placeholder="일지 볼 프로젝트" style={{ minWidth: 220 }} value={selected?.id} onChange={(v) => setSelected((data?.items ?? []).find((p) => p.id === v) ?? null)}
          options={(data?.items ?? []).map((p) => ({ value: p.id, label: String(p.projectNm) }))} />} />
      <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${T.border2}` }}>
        {selected
          ? <RecordPanel kind="project-logs" title={`일자별 일지 — ${String(selected.projectNm)}`} fields={PROJECT_LOG_FIELDS} fixed={{ projectId: selected.id }} dateLabel="일자" writerSlugs={[SLUG]} compact />
          : <Text type="secondary" style={{ fontSize: 12 }}>위에서 프로젝트를 고르면 일자별 일지를 적을 수 있습니다. 사진 첨부는 다음 단계.</Text>}
      </div>
    </div>
  );
}

export default EquipmentTechBoard;
