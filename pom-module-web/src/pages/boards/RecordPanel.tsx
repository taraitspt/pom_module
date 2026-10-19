import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button, Col, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Space, Table, Tag, Tooltip, Typography, message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { useMenuAccess } from '@/hooks/useMenuAccess';
import { createRecord, deleteRecord, listRecords, updateRecord, type RecordKind, type RecordQuery, type RecordRow } from '@/api/records.api';
import { T } from '@/theme/designTokens';

const { Text } = Typography;
const { RangePicker } = DatePicker;

/**
 * 현황판 입력 테이블 공통 패널 — 필드 정의(FieldDef)만 주면 목록·필터·등록/수정 모달·삭제가 나온다.
 * 서버 공통 CRUD(`/api/boards/records/{kind}`)와 짝. 권한은 writerSlugs 중 하나가 메뉴 권한에 있으면 쓰기 가능.
 */

export type FieldType = 'text' | 'textarea' | 'date' | 'select' | 'number';

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: { value: string; label: string; color?: string }[];
  /** 표 열 너비. 0 이면 표에 안 보임(폼에만). */
  width?: number;
  span?: number;          // 폼 칸 (24 기준), 기본 12
  ellipsis?: boolean;
  tags?: boolean;         // select 에서 새 값 입력 허용
}

export interface RecordPanelProps {
  kind: RecordKind;
  title: string;
  fields: FieldDef[];
  /** 모든 요청·저장에 붙는 고정 값 (예: boardSlug) */
  fixed?: Record<string, string | number>;
  /** 기간 필터를 걸 날짜 필드 라벨 (서버 dateField 와 같음) */
  dateLabel?: string;
  writerSlugs: string[];
  statusField?: string;
  defaultValues?: Record<string, unknown>;
  compact?: boolean;
  /** 목록 머리글 옆에 추가로 보여줄 것 */
  extra?: React.ReactNode;
}

export default function RecordPanel({ kind, title, fields, fixed, dateLabel, writerSlugs, statusField, defaultValues, compact, extra }: RecordPanelProps) {
  const qc = useQueryClient();
  const { menuKeys } = useMenuAccess();
  const canEdit = menuKeys == null || writerSlugs.some((s) => menuKeys.has(`/dashboards/${s}`));
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string[]>([]);
  const [editing, setEditing] = useState<RecordRow | null | 'new'>(null);

  const params: RecordQuery = {
    from: range?.[0]?.format('YYYY-MM-DD'), to: range?.[1]?.format('YYYY-MM-DD'), q: q || undefined,
    ...(statusField && status.length ? { [statusField]: status.join(',') } : {}),
    ...Object.fromEntries(Object.entries(fixed ?? {}).map(([k, v]) => [k, String(v)])),
  };
  const { data, isLoading, isError } = useQuery({ queryKey: ['records', kind, params], queryFn: () => listRecords(kind, params), staleTime: 30 * 1000 });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['records', kind] });
  const del = useMutation({ mutationFn: (id: number) => deleteRecord(kind, id), onSuccess: () => { message.success('삭제했습니다.'); invalidate(); }, onError: () => message.error('삭제에 실패했습니다.') });

  const statusDef = fields.find((f) => f.name === statusField);
  const optionLabel = (f: FieldDef, v: unknown) => f.options?.find((o) => o.value === v)?.label ?? (v as string);
  const columns: ColumnsType<RecordRow> = useMemo(() => [
    ...fields.filter((f) => f.width !== 0).map((f): ColumnsType<RecordRow>[number] => ({
      title: f.label, dataIndex: f.name, width: f.width, ellipsis: f.ellipsis ?? f.type === 'textarea',
      sorter: f.type === 'date' || f.type === 'number' ? (a, b) => String(a[f.name] ?? '').localeCompare(String(b[f.name] ?? '')) : undefined,
      render: (v: unknown) => {
        if (v == null || v === '') return <Text type="secondary">-</Text>;
        if (f.type === 'select') {
          const o = f.options?.find((x) => x.value === v);
          return o?.color ? <Tag color={o.color}>{o.label}</Tag> : <span>{o?.label ?? String(v)}</span>;
        }
        if (f.type === 'number') return <span className="tabular-nums">{Number(v).toLocaleString('ko-KR')}</span>;
        if (f.type === 'textarea') return <Tooltip title={String(v)}><span>{String(v)}</span></Tooltip>;
        return <span>{String(v)}</span>;
      },
    })),
    ...(canEdit ? [{
      title: '', key: 'act', width: 70, render: (_: unknown, r: RecordRow) => (
        <Space size={0}>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => setEditing(r)} />
          <Popconfirm title="삭제할까요?" onConfirm={() => del.mutate(r.id)}><Button type="text" size="small" danger icon={<DeleteOutlined />} /></Popconfirm>
        </Space>
      ),
    } as ColumnsType<RecordRow>[number]] : []),
  ], [fields, canEdit, del]);

  return (
    <div>
      <Space wrap size={[8, 8]} style={{ marginBottom: 12, width: '100%' }}>
        <Text strong style={{ fontSize: 13 }}>{title}</Text>
        {data && <Text type="secondary" style={{ fontSize: 12 }}>{data.total.toLocaleString()}건</Text>}
        {statusDef && data && Object.entries(data.statusCounts).map(([k, n]) => (
          <Tag key={k} color={statusDef.options?.find((o) => o.value === k)?.color}>{optionLabel(statusDef, k)} {n}</Tag>
        ))}
        <span style={{ marginLeft: 'auto' }} />
        {extra}
        <RangePicker size="small" value={range} onChange={(v) => setRange(v as [Dayjs, Dayjs] | null)} allowClear placeholder={[`${dateLabel ?? '일자'} 부터`, '까지']} />
        {statusDef && (
          <Select size="small" mode="multiple" allowClear placeholder="상태" style={{ minWidth: 140 }} value={status} onChange={setStatus}
            options={statusDef.options?.map((o) => ({ value: o.value, label: o.label }))} />
        )}
        <Input size="small" allowClear prefix={<SearchOutlined />} placeholder="검색" style={{ width: 180 }}
          onPressEnter={(e) => setQ((e.target as HTMLInputElement).value)} onChange={(e) => { if (!e.target.value) setQ(''); }} />
        {canEdit && <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setEditing('new')}>등록</Button>}
      </Space>
      <Table<RecordRow> size="small" rowKey="id" loading={isLoading} columns={columns} dataSource={data?.items ?? []}
        pagination={compact ? { pageSize: 10, showSizeChanger: false } : { pageSize: 20, showSizeChanger: true }}
        locale={{ emptyText: isError ? '불러오지 못했습니다. 현황판 권한을 확인해 주세요.' : '등록된 항목이 없습니다.' }} />
      {editing && (
        <RecordModal kind={kind} title={title} fields={fields} fixed={fixed} row={editing === 'new' ? null : editing} defaultValues={defaultValues}
          onClose={() => setEditing(null)} onSaved={() => { setEditing(null); invalidate(); }} />
      )}
    </div>
  );
}

function RecordModal({ kind, title, fields, fixed, row, defaultValues, onClose, onSaved }: {
  kind: RecordKind; title: string; fields: FieldDef[]; fixed?: Record<string, string | number>; row: RecordRow | null;
  defaultValues?: Record<string, unknown>; onClose: () => void; onSaved: () => void;
}) {
  const [form] = Form.useForm();
  const mut = useMutation({
    mutationFn: (body: Record<string, unknown>) => (row ? updateRecord(kind, row.id, body) : createRecord(kind, body)),
    onSuccess: () => { message.success(row ? '수정했습니다.' : '등록했습니다.'); onSaved(); },
    onError: (e: { response?: { data?: { message?: string } } }) => message.error(e?.response?.data?.message ?? '저장에 실패했습니다.'),
  });
  const init: Record<string, unknown> = {};
  for (const f of fields) {
    const v = row ? row[f.name] : defaultValues?.[f.name];
    if (f.type === 'date') init[f.name] = v ? dayjs(String(v)) : (row ? null : (f.required ? dayjs() : null));
    else if (f.type === 'select' && f.tags) init[f.name] = v ? [v] : [];
    else init[f.name] = v ?? null;
  }
  const submit = (v: Record<string, unknown>) => {
    const body: Record<string, unknown> = { ...fixed };
    for (const f of fields) {
      const val = v[f.name];
      if (f.type === 'date') body[f.name] = val ? (val as Dayjs).format('YYYY-MM-DD') : null;
      else if (f.type === 'select' && f.tags) body[f.name] = Array.isArray(val) ? (val[0] ? String(val[0]).trim() : null) : val ?? null;
      else body[f.name] = val === '' ? null : val ?? null;
    }
    mut.mutate(body);
  };
  return (
    <Modal open title={row ? `${title} 수정` : `${title} 등록`} onCancel={onClose} okText="저장" cancelText="취소"
      confirmLoading={mut.isPending} onOk={() => form.submit()} destroyOnHidden width={680}>
      <Form form={form} layout="vertical" size="small" initialValues={init} onFinish={submit} style={{ marginTop: 12 }}>
        <Row gutter={12}>
          {fields.map((f) => (
            <Col key={f.name} span={f.span ?? (f.type === 'textarea' ? 24 : 12)}>
              <Form.Item name={f.name} label={f.label} rules={f.required ? [{ required: true, message: `${f.label}을(를) 입력하세요.` }] : undefined}>
                {f.type === 'date' ? <DatePicker style={{ width: '100%' }} />
                  : f.type === 'textarea' ? <Input.TextArea rows={3} />
                    : f.type === 'number' ? <InputNumber style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(v) => Number((v ?? '').replace(/,/g, ''))} />
                      : f.type === 'select' ? (
                        f.tags ? <Select mode="tags" maxCount={1} showSearch allowClear options={f.options?.map((o) => ({ value: o.value, label: o.label }))} />
                          : <Select allowClear={!f.required} options={f.options?.map((o) => ({ value: o.value, label: o.label }))} />
                      ) : <Input />}
              </Form.Item>
            </Col>
          ))}
        </Row>
      </Form>
    </Modal>
  );
}

export const STATUS_COLORS = { todo: T.bl, progress: T.wa, done: T.ok, hold: T.er };
