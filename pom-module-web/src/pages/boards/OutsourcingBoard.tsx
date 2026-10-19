import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Col, DatePicker, Empty, Row, Space, Spin, Table, Tabs, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import dayjs, { type Dayjs } from 'dayjs';
import PageLayout from '@/components/layout/PageLayout';
import PageHeader from '@/components/layout/PageHeader';
import { getOutsourcingPurchaseOrders, getOutsourcingQuality, type PurchaseOrder, type VendorAgg } from '@/api/records.api';
import type { DashboardDef } from '@/pages/dashboards/dashboardRegistry';
import type { QualityIssue } from '@/types/boards';
import { T } from '@/theme/designTokens';
import { C_PRIMARY, C_THIRD, ChartCard, KpiTile, MonthlyBars, fmtEok, fmtNum } from './boardUi';
import RecordPanel from './RecordPanel';
import { WORK_ITEM_FIELDS } from './recordConfigs';

const { Text } = Typography;
const { RangePicker } = DatePicker;

/**
 * 외주협력팀 운영현황 (React). ERP 출처 확인된 것: 외주 발주(PP_PURORDER — 협력사·담당자·일자별), 외주 부적합(ME_QLTYNSTB_MST 02).
 * 입력: 일일 업무(board_work_item, boardSlug=outsourcing). 비어 둔 것: 월마감 확정 외주비(회계 출처 확인 필요), 마진율(기준단가 업로드 필요).
 */
const OutsourcingBoard = ({ def }: { def: DashboardDef }) => (
  <PageLayout>
    <PageHeader title={def.label} sub="ERP 외주 발주·외주 부적합은 실시간 · 확정 외주비·마진은 출처 확인 전" />
    <Tabs
      defaultActiveKey="partners"
      items={[
        { key: 'partners', label: '협력사 운영 현황', children: <PartnersTab /> },
        { key: 'quality', label: '외주품질비용', children: <OutsourcingQualityTab /> },
        { key: 'daily', label: '일일 업무', children: <RecordPanel kind="work-items" title="외주 운영 업무" fields={WORK_ITEM_FIELDS} fixed={{ boardSlug: 'outsourcing' }} dateLabel="시작일" statusField="status" writerSlugs={['outsourcing']} defaultValues={{ status: 'PROGRESS' }} /> },
        { key: 'cost', label: '누적 외주비', children: <Empty description="월마감 확정 외주비 — ERP 정산·매입 출처를 회계팀과 확인한 뒤 연결" style={{ padding: 60 }} /> },
        { key: 'margin', label: '마진율 분석', children: <Empty description="기준단가 대비 마진 — 기준단가 업로드 테이블이 필요" style={{ padding: 60 }} /> },
      ]}
    />
  </PageLayout>
);

function PartnersTab() {
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().startOf('month'), dayjs()]);
  const from = range[0].format('YYYY-MM-DD');
  const to = range[1].format('YYYY-MM-DD');
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['outsourcing-po', from, to], queryFn: () => getOutsourcingPurchaseOrders(from, to), staleTime: 5 * 60 * 1000, retry: false });
  const [vendor, setVendor] = useState<string | null>(null);
  const rows = useMemo(() => (data?.rows ?? []).filter((r) => !vendor || r.partnerCd === vendor), [data, vendor]);
  const top = (data?.byVendor ?? []).slice(0, 8);
  const top5 = (data?.byVendor ?? []).slice(0, 5).reduce((s, v) => s + v.share, 0);

  const vendorCols: ColumnsType<VendorAgg> = [
    { title: '#', width: 40, render: (_: unknown, __: VendorAgg, i: number) => i + 1 },
    { title: '협력사', dataIndex: 'partnerNm', ellipsis: true },
    { title: '담당', dataIndex: 'owners', width: 120, ellipsis: true },
    { title: '발주', dataIndex: 'count', width: 60, align: 'right' },
    { title: '주문', dataIndex: 'orders', width: 60, align: 'right' },
    { title: '금액', dataIndex: 'amount', width: 130, align: 'right', render: (v: number) => <span className="tabular-nums">{fmtNum(v)}원</span>, sorter: (a, b) => a.amount - b.amount },
    { title: '비중', dataIndex: 'share', width: 70, align: 'right', render: (v: number) => `${v.toFixed(1)}%` },
    { title: '최근 발주', dataIndex: 'lastDate', width: 100 },
  ];
  const poCols: ColumnsType<PurchaseOrder> = [
    { title: '발주일', dataIndex: 'poDate', width: 100 },
    { title: '발주번호', dataIndex: 'poNo', width: 150 },
    { title: '협력사', dataIndex: 'partnerNm', width: 150, ellipsis: true },
    { title: '담당', dataIndex: 'empNm', width: 80 },
    { title: '주문번호', dataIndex: 'orderNo', width: 150 },
    { title: '주문명', dataIndex: 'orderNm', ellipsis: true },
    { title: '공정', dataIndex: 'processes', width: 150, ellipsis: true, render: (v: string) => v.split(',').map((p) => p.split(':')[1]).filter(Boolean).join(', ') },
    { title: '금액', dataIndex: 'amount', width: 120, align: 'right', render: (v: number) => <span className="tabular-nums">{fmtNum(v)}원</span>, sorter: (a, b) => a.amount - b.amount },
  ];
  return (
    <div>
      <Space wrap style={{ marginBottom: 12 }}>
        <RangePicker size="small" value={range} onChange={(v) => v && v[0] && v[1] && setRange([v[0], v[1]])} allowClear={false} />
        <Text type="secondary" style={{ fontSize: 12 }}>발주일 기준 · 최대 186일 · ERP PP_PURORDER</Text>
      </Space>
      {isLoading && <div style={{ padding: 60, textAlign: 'center' }}><Spin /></div>}
      {isError && <Alert type="error" showIcon message="외주 발주를 불러오지 못했습니다." description={(error as { response?: { data?: { message?: string } } })?.response?.data?.message} />}
      {data && (
        <>
          <Row gutter={[12, 12]}>
            <Col xs={12} lg={6}><KpiTile label="운영 협력사" value={fmtNum(data.vendors)} unit="개사" sub={`${from} ~ ${to}`} /></Col>
            <Col xs={12} lg={6}><KpiTile label="발주 금액" value={fmtEok(data.amount, 2)} sub={`${fmtNum(data.amount)}원`} /></Col>
            <Col xs={12} lg={6}><KpiTile label="발주 건수" value={fmtNum(data.count)} unit="건" sub={`주문 ${fmtNum(data.orders)}개`} /></Col>
            <Col xs={12} lg={6}><KpiTile label="상위 5개사 비중" value={top5.toFixed(1)} unit="%" sub="금액 기준" /></Col>
          </Row>
          <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
            <Col xs={24} lg={12}>
              <ChartCard title="주요 협력사 발주 비중 (상위 8)" height={260}>
                <BarChart data={top.map((v) => ({ name: v.partnerNm.length > 10 ? `${v.partnerNm.slice(0, 10)}…` : v.partnerNm, full: v.partnerNm, amount: v.amount / 1e4, share: v.share }))} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <CartesianGrid horizontal={false} stroke={T.border2} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: T.t3 }} tickFormatter={(v: number) => `${fmtNum(v)}만`} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: T.t2 }} />
                  <Tooltip formatter={(v: number) => [`${fmtNum(v)}만원`, '발주']} labelFormatter={(_, p) => (p?.[0]?.payload as { full?: string })?.full ?? ''} />
                  <Bar dataKey="amount" fill={C_PRIMARY} radius={[0, 3, 3, 0]} onClick={(d) => setVendor((d as unknown as { payload?: { full?: string } })?.payload?.full ? top.find((v) => v.partnerNm === (d as unknown as { payload: { full: string } }).payload.full)?.partnerCd ?? null : null)} />
                </BarChart>
              </ChartCard>
            </Col>
            <Col xs={24} lg={12}>
              <ChartCard title="담당자별 발주" height={260}>
                <BarChart data={data.byOwner.map((o) => ({ name: o.empNm, amount: o.amount / 1e4, count: o.count }))} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid vertical={false} stroke={T.border2} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: T.t3 }} />
                  <YAxis tick={{ fontSize: 11, fill: T.t3 }} tickFormatter={(v: number) => `${fmtNum(v)}만`} width={60} />
                  <Tooltip formatter={(v: number, n: string) => (n === 'amount' ? [`${fmtNum(v)}만원`, '금액'] : [v, '건수'])} />
                  <Bar dataKey="amount" fill={C_THIRD} radius={[3, 3, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ChartCard>
            </Col>
          </Row>
          <div style={{ marginTop: 12 }}>
            <Table<VendorAgg> size="small" rowKey="partnerCd" columns={vendorCols} dataSource={data.byVendor} pagination={{ pageSize: 15 }}
              title={() => <Space><Text strong>협력사 전체 ({data.byVendor.length}개사)</Text>{vendor && <Tag closable onClose={() => setVendor(null)}>{data.byVendor.find((v) => v.partnerCd === vendor)?.partnerNm}</Tag>}</Space>}
              onRow={(r) => ({ onClick: () => setVendor(vendor === r.partnerCd ? null : r.partnerCd), style: { cursor: 'pointer', background: vendor === r.partnerCd ? `${T.primary}11` : undefined } })} />
          </div>
          <div style={{ marginTop: 12 }}>
            <Table<PurchaseOrder> size="small" rowKey="poNo" columns={poCols} dataSource={rows} pagination={{ pageSize: 30, showSizeChanger: true }}
              title={() => <Text strong>발주 상세 ({rows.length}건{vendor ? ' · 협력사 선택' : ''})</Text>} />
          </div>
        </>
      )}
    </div>
  );
}

function OutsourcingQualityTab() {
  const year = dayjs().year();
  const { data, isLoading, isError } = useQuery({ queryKey: ['outsourcing-quality', year], queryFn: () => getOutsourcingQuality(year), staleTime: 5 * 60 * 1000, retry: false });
  const issues = data ?? [];
  const total = issues.reduce((s, i) => s + i.procAmt, 0);
  const claims = issues.filter((i) => i.acptTpCd === '006');
  const cntM = Array.from({ length: 12 }, (_, m) => issues.filter((i) => Number(i.month.slice(5, 7)) === m + 1).length);
  const costM = Array.from({ length: 12 }, (_, m) => issues.filter((i) => Number(i.month.slice(5, 7)) === m + 1).reduce((s, i) => s + i.procAmt, 0));
  const byType = Object.entries(issues.reduce<Record<string, { n: number; amt: number }>>((acc, i) => { const k = i.acptTpNm || '기타'; acc[k] = acc[k] ?? { n: 0, amt: 0 }; acc[k].n++; acc[k].amt += i.procAmt; return acc; }, {}));
  const byVendor = Object.entries(issues.reduce<Record<string, { n: number; amt: number }>>((acc, i) => { const k = i.osrcPartnerNm || '(업체 없음)'; acc[k] = acc[k] ?? { n: 0, amt: 0 }; acc[k].n++; acc[k].amt += i.procAmt; return acc; }, {})).sort((a, b) => b[1].amt - a[1].amt);
  const columns: ColumnsType<QualityIssue> = [
    { title: '접수일', dataIndex: 'date', width: 100 },
    { title: '접수유형', dataIndex: 'acptTpNm', width: 100 },
    { title: '사고 업체', dataIndex: 'osrcPartnerNm', width: 140, ellipsis: true },
    { title: '거래처', dataIndex: 'partnerNm', width: 130, ellipsis: true },
    { title: '공정', dataIndex: 'processName', width: 80 },
    { title: '부적합', dataIndex: 'nstbDcNm', width: 100 },
    { title: '주문', dataIndex: 'orderNm', ellipsis: true },
    { title: '품질비용', dataIndex: 'procAmt', width: 110, align: 'right', render: (v: number) => <span className="tabular-nums">{fmtNum(v)}원</span> },
  ];
  if (isLoading) return <div style={{ padding: 60, textAlign: 'center' }}><Spin /></div>;
  if (isError) return <Alert type="error" showIcon message="외주 부적합을 불러오지 못했습니다." />;
  return (
    <div>
      <Row gutter={[12, 12]}>
        <Col xs={12} lg={6}><KpiTile label={`${year}년 외주 품질비용`} value={fmtNum(Math.round(total / 1e4))} unit="만원" sub={`${issues.length}건 · ERP 부적합(외주)`} /></Col>
        <Col xs={12} lg={6}><KpiTile label="클레임" value={fmtNum(claims.length)} unit="건" sub={`${fmtNum(Math.round(claims.reduce((s, i) => s + i.procAmt, 0) / 1e4))}만원`} /></Col>
        <Col xs={12} lg={6}><KpiTile label="공정불량·검수불량 등" value={fmtNum(issues.length - claims.length)} unit="건" sub="클레임 외" /></Col>
        <Col xs={12} lg={6}><KpiTile label="사고 업체" value={fmtNum(byVendor.length)} unit="개사" sub={byVendor[0] ? `최다 ${byVendor[0][0]} ${byVendor[0][1].n}건` : ''} /></Col>
      </Row>
      <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
        <Col xs={24} lg={12}><ChartCard title="월별 품질사고" height={200}><MonthlyBars series={[{ key: 'c', name: '건수', color: C_PRIMARY, values: cntM }]} unit="건" /></ChartCard></Col>
        <Col xs={24} lg={12}><ChartCard title="월별 품질비용" height={200} extra="만원"><MonthlyBars series={[{ key: 'c', name: '비용', color: C_THIRD, values: costM }]} unit="만원" valueScale={1e4} /></ChartCard></Col>
      </Row>
      <Space wrap size={[6, 6]} style={{ margin: '12px 0' }}>
        {byType.map(([k, v]) => <Tag key={k}>{k} {v.n}건 · {fmtNum(Math.round(v.amt / 1e4))}만원</Tag>)}
      </Space>
      <Table<QualityIssue> size="small" rowKey="nstbNo" columns={columns} dataSource={[...issues].sort((a, b) => b.date.localeCompare(a.date))} pagination={{ pageSize: 20 }}
        expandable={{ expandedRowRender: (r) => <div style={{ fontSize: 12, color: T.t2, whiteSpace: 'pre-wrap' }}><div><Text strong>부적합 내용</Text> {r.content || '-'}</div></div> }} />
    </div>
  );
}

export default OutsourcingBoard;
