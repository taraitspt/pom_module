import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Badge, Button, Card, Col, DatePicker, Empty, Form, Input, Modal, Popconfirm, Row, Segmented, Select, Space, Table, Tag, Tooltip, Typography, message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { useMenuAccess } from '@/hooks/useMenuAccess';
import { changeMaintStatus, createMaintIssue, deleteMaintIssue, getMaintMeta, listMaintIssues, updateMaintIssue } from '@/api/maint.api';
import {
  MAINT_STATUS_LABEL, MAINT_STATUS_ORDER, type MaintIssue, type MaintIssueSave, type MaintMeta, type MaintStatus,
} from '@/types/maint';
import { T } from '@/theme/designTokens';

const { Text } = Typography;
const { RangePicker } = DatePicker;

/**
 * 설비 정비 이슈 — 세 현황판(설비기술·생산운영팀·인쇄파트)이 같은 데이터를 본다.
 * 보드(상태별 칸반)·목록 두 보기, 공정 칩·기간·검색 필터, 등록/수정/삭제(설비기술 대시보드 권한이 있을 때만).
 *
 * @param processes  이 현황판이 보는 공정만(인쇄파트 = sheet/web). 비우면 전체.
 * @param compact    생산운영팀 '설비' 탭처럼 다른 화면 안에 넣을 때 — 머리글을 줄인다.
 */
export default function MaintIssuePanel({ processes, compact }: { processes?: string[]; compact?: boolean }) {
  const qc = useQueryClient();
  const { menuKeys } = useMenuAccess();
  const canEdit = menuKeys == null || menuKeys.has('/dashboards/equipment-tech');

  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [proc, setProc] = useState<string>('ALL');
  const [view, setView] = useState<'board' | 'list'>('board');
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<MaintStatus[]>([]);
  const [editing, setEditing] = useState<MaintIssue | null | 'new'>(null);

  const { data: meta } = useQuery({ queryKey: ['maint-meta'], queryFn: getMaintMeta, staleTime: 5 * 60 * 1000 });
  const params = {
    from: range?.[0]?.format('YYYY-MM-DD'), to: range?.[1]?.format('YYYY-MM-DD'),
    processes: proc === 'ALL' ? processes : [proc], q: q || undefined,
    statuses: view === 'list' && statusFilter.length ? statusFilter : undefined,
  };
  const { data, isLoading, isError } = useQuery({
    queryKey: ['maint-issues', params],
    queryFn: () => listMaintIssues(params),
    staleTime: 60 * 1000,
  });
  const invalidate = () => { qc.invalidateQueries({ queryKey: ['maint-issues'] }); qc.invalidateQueries({ queryKey: ['maint-meta'] }); };
  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: MaintStatus }) => changeMaintStatus(id, status),
    onSuccess: () => { message.success('상태를 바꿨습니다.'); invalidate(); },
    onError: () => message.error('상태 변경에 실패했습니다. 설비기술 대시보드 권한이 필요합니다.'),
  });
  const delMut = useMutation({
    mutationFn: (id: number) => deleteMaintIssue(id),
    onSuccess: () => { message.success('삭제했습니다.'); invalidate(); },
    onError: () => message.error('삭제에 실패했습니다.'),
  });

  const procOptions = useMemo(() => {
    const all = meta?.processes ?? [];
    const scoped = processes ? all.filter((p) => processes.includes(p.code)) : all;
    return [{ label: '전체', value: 'ALL' }, ...scoped.map((p) => ({ label: p.name, value: p.code }))];
  }, [meta, processes]);
  const procName = (code: string) => meta?.processes.find((p) => p.code === code)?.name ?? code;
  const items = data?.items ?? [];
  const counts = data?.statusCounts;

  return (
    <div>
      <Space wrap size={[8, 8]} style={{ marginBottom: 12, width: '100%' }}>
        <Segmented value={proc} onChange={(v) => setProc(String(v))} options={procOptions} />
        <RangePicker size="small" value={range} onChange={(v) => setRange(v as [Dayjs, Dayjs] | null)} allowClear placeholder={['등록일 부터', '까지']} />
        <Input size="small" allowClear prefix={<SearchOutlined />} placeholder="내용·설비·업체·파트 검색" style={{ width: 220 }}
          onPressEnter={(e) => setQ((e.target as HTMLInputElement).value)} onChange={(e) => { if (!e.target.value) setQ(''); }} />
        <Segmented value={view} onChange={(v) => setView(v as 'board' | 'list')} options={[{ label: '상태별 보드', value: 'board' }, { label: '목록', value: 'list' }]} />
        {view === 'list' && (
          <Select size="small" mode="multiple" allowClear placeholder="상태" style={{ minWidth: 160 }} value={statusFilter}
            onChange={(v) => setStatusFilter(v as MaintStatus[])}
            options={MAINT_STATUS_ORDER.map((s) => ({ value: s, label: MAINT_STATUS_LABEL[s] }))} />
        )}
        <span style={{ marginLeft: 'auto' }} />
        <Text type="secondary" style={{ fontSize: 12 }}>{data ? `${data.total.toLocaleString()}건` : ''}</Text>
        {canEdit && <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setEditing('new')}>등록</Button>}
      </Space>

      {counts && !compact && (
        <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
          {MAINT_STATUS_ORDER.map((s) => (
            <Col key={s} xs={12} md={6}>
              <Card variant="borderless" styles={{ body: { padding: '10px 14px' } }} style={{ borderRadius: 10, border: `1px solid ${T.border2}` }}>
                <Text style={{ fontSize: 12, color: T.t3 }}>{MAINT_STATUS_LABEL[s]}</Text>
                <div className="tabular-nums" style={{ fontSize: 20, fontWeight: 700, color: statusColor(s) }}>{counts[s] ?? 0}<small style={{ fontSize: 12, color: T.t3, marginLeft: 2 }}>건</small></div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {isError && <Empty description="정비 이슈를 불러오지 못했습니다. 현황판 권한을 확인해 주세요." />}
      {!isError && view === 'board' && (
        <Row gutter={[12, 12]}>
          {MAINT_STATUS_ORDER.map((s) => {
            const col = items.filter((i) => i.status === s);
            return (
              <Col key={s} xs={24} md={12} xl={6}>
                <Card variant="borderless" loading={isLoading} styles={{ body: { padding: 10, maxHeight: 640, overflowY: 'auto' } }}
                  style={{ borderRadius: 12, border: `1px dashed ${T.border1}`, background: T.bg }}
                  title={<Space><Badge color={statusColor(s)} /><Text strong style={{ fontSize: 13 }}>{MAINT_STATUS_LABEL[s]}</Text><Text type="secondary" style={{ fontSize: 12 }}>{col.length}건</Text></Space>}>
                  {col.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="없음" />}
                  {col.slice(0, 200).map((i) => (
                    <Card key={i.id} size="small" variant="borderless" style={{ marginBottom: 8, borderRadius: 10, border: `1px solid ${T.border2}` }} styles={{ body: { padding: '10px 12px' } }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        <Text strong style={{ color: T.primary }}>{i.equipmentNm}</Text>
                        {i.partNm && <Text type="secondary" style={{ fontSize: 12 }}>({i.partNm})</Text>}
                        <span style={{ marginLeft: 'auto' }} />
                        {canEdit && (
                          <Space size={0}>
                            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => setEditing(i)} />
                            <Popconfirm title="삭제할까요?" onConfirm={() => delMut.mutate(i.id)}><Button type="text" size="small" danger icon={<DeleteOutlined />} /></Popconfirm>
                          </Space>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: T.t1, margin: '4px 0', whiteSpace: 'pre-wrap' }}>{i.content}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.t3 }}>
                        <span>{procName(i.processCd)} · {i.issueType} · {i.issueDate}{i.vendorNm ? ` · ${i.vendorNm}` : ''}</span>
                        <span style={{ marginLeft: 'auto' }} />
                        {canEdit ? (
                          <Select size="small" value={i.status} style={{ width: 84 }} loading={statusMut.isPending && statusMut.variables?.id === i.id}
                            onChange={(v) => statusMut.mutate({ id: i.id, status: v as MaintStatus })}
                            options={MAINT_STATUS_ORDER.map((x) => ({ value: x, label: MAINT_STATUS_LABEL[x] }))} />
                        ) : <Tag color={statusColor(i.status)}>{MAINT_STATUS_LABEL[i.status]}</Tag>}
                      </div>
                    </Card>
                  ))}
                  {col.length > 200 && <Text type="secondary" style={{ fontSize: 12 }}>…{col.length - 200}건 더 있음 — 목록 보기나 기간으로 좁혀 주세요.</Text>}
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
      {!isError && view === 'list' && (
        <MaintTable items={items} loading={isLoading} procName={procName} canEdit={canEdit}
          onEdit={(i) => setEditing(i)} onDelete={(id) => delMut.mutate(id)} />
      )}

      {editing && meta && (
        <MaintIssueModal
          issue={editing === 'new' ? null : editing}
          meta={meta}
          defaultProcess={proc !== 'ALL' ? proc : processes?.[0]}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); invalidate(); }}
        />
      )}
    </div>
  );
}

/** antd Select tags 모드 값(배열) → 문자열 하나. */
const first = (v: unknown): string | null => (Array.isArray(v) ? (v[0] ? String(v[0]).trim() : null) : v ? String(v).trim() : null);

function statusColor(s: MaintStatus) {
  return s === 'SCHEDULED' ? T.bl : s === 'PROGRESS' ? T.wa : s === 'DONE' ? T.ok : T.er;
}

function MaintTable({ items, loading, procName, canEdit, onEdit, onDelete }: {
  items: MaintIssue[]; loading: boolean; procName: (c: string) => string; canEdit: boolean;
  onEdit: (i: MaintIssue) => void; onDelete: (id: number) => void;
}) {
  const columns: ColumnsType<MaintIssue> = [
    { title: '등록일', dataIndex: 'issueDate', width: 105, sorter: (a, b) => a.issueDate.localeCompare(b.issueDate), defaultSortOrder: 'descend' },
    { title: '공정', dataIndex: 'processCd', width: 90, render: (v: string) => procName(v) },
    { title: '설비', dataIndex: 'equipmentNm', width: 130, render: (v: string, r) => <span>{v}{r.partNm ? <Text type="secondary"> ({r.partNm})</Text> : null}</span> },
    { title: '유형', dataIndex: 'issueType', width: 100 },
    { title: '내용', dataIndex: 'content', ellipsis: true, render: (v: string) => <Tooltip title={v}>{v}</Tooltip> },
    { title: '업체', dataIndex: 'vendorNm', width: 120, ellipsis: true, render: (v: string | null) => v ?? '-' },
    { title: '상태', dataIndex: 'status', width: 80, render: (v: MaintStatus) => <Tag color={statusColor(v)}>{MAINT_STATUS_LABEL[v]}</Tag> },
    { title: '완료일', dataIndex: 'endDate', width: 105, render: (v: string | null) => v ?? '-' },
    ...(canEdit ? [{
      title: '', key: 'act', width: 70, render: (_: unknown, r: MaintIssue) => (
        <Space size={0}>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => onEdit(r)} />
          <Popconfirm title="삭제할까요?" onConfirm={() => onDelete(r.id)}><Button type="text" size="small" danger icon={<DeleteOutlined />} /></Popconfirm>
        </Space>
      ),
    } as ColumnsType<MaintIssue>[number]] : []),
  ];
  return <Table<MaintIssue> size="small" rowKey="id" loading={loading} columns={columns} dataSource={items} pagination={{ pageSize: 30, showSizeChanger: true }} />;
}

function MaintIssueModal({ issue, meta, defaultProcess, onClose, onSaved }: {
  issue: MaintIssue | null; meta: MaintMeta;
  defaultProcess?: string; onClose: () => void; onSaved: () => void;
}) {
  const [form] = Form.useForm();
  const mut = useMutation({
    mutationFn: (body: MaintIssueSave) => (issue ? updateMaintIssue(issue.id, body) : createMaintIssue(body)),
    onSuccess: () => { message.success(issue ? '수정했습니다.' : '등록했습니다.'); onSaved(); },
    onError: (e: { response?: { data?: { message?: string } } }) => message.error(e?.response?.data?.message ?? '저장에 실패했습니다.'),
  });
  const opt = (arr: string[]) => arr.map((v) => ({ value: v, label: v }));
  return (
    <Modal open title={issue ? '정비 이슈 수정' : '정비 이슈 등록'} onCancel={onClose} okText="저장" cancelText="취소"
      confirmLoading={mut.isPending} onOk={() => form.submit()} destroyOnHidden width={640}>
      <Form form={form} layout="vertical" size="small" style={{ marginTop: 12 }}
        initialValues={issue ? {
          ...issue, issueDate: dayjs(issue.issueDate), endDate: issue.endDate ? dayjs(issue.endDate) : null,
          equipmentNm: [issue.equipmentNm], partNm: issue.partNm ? [issue.partNm] : [], issueType: [issue.issueType], vendorNm: issue.vendorNm ? [issue.vendorNm] : [],
        } : { issueDate: dayjs(), status: 'SCHEDULED', processCd: defaultProcess ?? 'sheet', equipmentNm: [], partNm: [], issueType: [], vendorNm: [] }}
        onFinish={(v) => mut.mutate({
          ...v, issueDate: (v.issueDate as Dayjs).format('YYYY-MM-DD'), endDate: v.endDate ? (v.endDate as Dayjs).format('YYYY-MM-DD') : null,
          equipmentNm: first(v.equipmentNm) ?? '', partNm: first(v.partNm), issueType: first(v.issueType) ?? '', vendorNm: first(v.vendorNm),
        })}>
        <Row gutter={12}>
          <Col span={8}><Form.Item name="issueDate" label="등록일" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={8}><Form.Item name="processCd" label="공정" rules={[{ required: true }]}><Select options={meta.processes.map((p) => ({ value: p.code, label: p.name }))} /></Form.Item></Col>
          <Col span={8}><Form.Item name="status" label="상태" rules={[{ required: true }]}><Select options={meta.statuses.map((s) => ({ value: s.code, label: s.name }))} /></Form.Item></Col>
          <Col span={12}><Form.Item name="equipmentNm" label="설비" rules={[{ required: true }]}><Select showSearch allowClear mode="tags" maxCount={1} options={opt(meta.equipments)} placeholder="설비명 (새 이름 입력 가능)" /></Form.Item></Col>
          <Col span={12}><Form.Item name="partNm" label="파트"><Select showSearch allowClear mode="tags" maxCount={1} options={opt(meta.parts)} /></Form.Item></Col>
          <Col span={12}><Form.Item name="issueType" label="유형" rules={[{ required: true }]}><Select showSearch allowClear mode="tags" maxCount={1} options={opt(meta.types)} /></Form.Item></Col>
          <Col span={12}><Form.Item name="vendorNm" label="업체"><Select showSearch allowClear mode="tags" maxCount={1} options={opt(meta.vendors)} placeholder="자체 / 업체명" /></Form.Item></Col>
          <Col span={24}><Form.Item name="content" label="내용" rules={[{ required: true, max: 1000 }]}><Input.TextArea rows={3} /></Form.Item></Col>
          <Col span={8}><Form.Item name="endDate" label="완료일"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={8}><Form.Item name="ownerNm" label="담당자"><Input /></Form.Item></Col>
          <Col span={8}><Form.Item name="note" label="비고"><Input /></Form.Item></Col>
        </Row>
      </Form>
    </Modal>
  );
}
