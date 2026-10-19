import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, DatePicker, Input, Segmented, Space, Typography, message } from 'antd';
import { LeftOutlined, RightOutlined, SaveOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { useMenuAccess } from '@/hooks/useMenuAccess';
import { createRecord, listRecords, updateRecord, type RecordRow } from '@/api/records.api';
import { T } from '@/theme/designTokens';

const { Text } = Typography;

type ReportType = 'DAILY' | 'WEEKLY' | 'MONTHLY';
const LABEL: Record<ReportType, string> = { DAILY: '일일보고', WEEKLY: '주간보고', MONTHLY: '월간보고' };

/** 키: DAILY=YYYY-MM-DD, WEEKLY=주 시작일(월요일), MONTHLY=YYYY-MM. 날짜 필드(reportDate)는 키의 날짜. */
function keyOf(type: ReportType, d: Dayjs) {
  if (type === 'DAILY') return d.format('YYYY-MM-DD');
  if (type === 'WEEKLY') return d.startOf('week').add(1, 'day').format('YYYY-MM-DD');
  return d.format('YYYY-MM');
}
function dateOf(type: ReportType, key: string) {
  return type === 'MONTHLY' ? `${key}-01` : key;
}

/** 보고서 패널 — 날짜(또는 주·월)를 고르고 텍스트를 저장한다. 저장은 (현황판, 유형, 키)당 한 건. */
export default function ReportPanel({ boardSlug, writerSlugs }: { boardSlug: string; writerSlugs: string[] }) {
  const qc = useQueryClient();
  const { menuKeys } = useMenuAccess();
  const canEdit = menuKeys == null || writerSlugs.some((s) => menuKeys.has(`/dashboards/${s}`));
  const [type, setType] = useState<ReportType>('DAILY');
  const [day, setDay] = useState<Dayjs>(dayjs());
  const key = keyOf(type, day);
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');

  const { data, isFetching } = useQuery({
    queryKey: ['records', 'report-docs', boardSlug, type, key],
    queryFn: () => listRecords<RecordRow>('report-docs', { boardSlug, reportType: type, reportKey: key }),
  });
  const existing = data?.items?.[0];
  useEffect(() => {
    setText(existing ? String(existing.content ?? '') : '');
    setTitle(existing ? String(existing.title ?? '') : '');
  }, [existing?.id, key, type]);

  const { data: recent } = useQuery({
    queryKey: ['records', 'report-docs', boardSlug, type, 'recent'],
    queryFn: () => listRecords<RecordRow>('report-docs', { boardSlug, reportType: type }),
  });

  const save = useMutation({
    mutationFn: () => {
      const body = { boardSlug, reportType: type, reportKey: key, reportDate: dateOf(type, key), title: title || null, content: text };
      return existing ? updateRecord('report-docs', existing.id, body) : createRecord('report-docs', body);
    },
    onSuccess: () => { message.success('저장했습니다.'); qc.invalidateQueries({ queryKey: ['records', 'report-docs'] }); },
    onError: (e: { response?: { data?: { message?: string } } }) => message.error(e?.response?.data?.message ?? '저장에 실패했습니다.'),
  });
  const step = (n: number) => setDay(type === 'DAILY' ? day.add(n, 'day') : type === 'WEEKLY' ? day.add(n, 'week') : day.add(n, 'month'));

  return (
    <div>
      <Space wrap style={{ marginBottom: 12 }}>
        <Segmented value={type} onChange={(v) => setType(v as ReportType)} options={(['DAILY', 'WEEKLY', 'MONTHLY'] as ReportType[]).map((t) => ({ value: t, label: LABEL[t] }))} />
        <Button size="small" icon={<LeftOutlined />} onClick={() => step(-1)} />
        <DatePicker size="small" value={day} onChange={(v) => v && setDay(v)} picker={type === 'MONTHLY' ? 'month' : type === 'WEEKLY' ? 'week' : 'date'} allowClear={false} />
        <Button size="small" icon={<RightOutlined />} onClick={() => step(1)} />
        <Text type="secondary" style={{ fontSize: 12 }}>{type === 'WEEKLY' ? `주 시작 ${key}` : key}{existing ? ' · 저장본' : ' · 미작성'}</Text>
        <span style={{ marginLeft: 'auto' }} />
        {canEdit && <Button type="primary" size="small" icon={<SaveOutlined />} loading={save.isPending} disabled={!text.trim()} onClick={() => save.mutate()}>저장</Button>}
      </Space>
      <Input size="small" placeholder="제목(선택)" value={title} onChange={(e) => setTitle(e.target.value)} readOnly={!canEdit} style={{ marginBottom: 8 }} />
      <Input.TextArea rows={16} value={text} onChange={(e) => setText(e.target.value)} readOnly={!canEdit} disabled={isFetching}
        placeholder={canEdit ? `${LABEL[type]} 내용을 적고 저장하세요.` : '작성 권한이 없습니다.'} style={{ fontFamily: 'inherit' }} />
      <div style={{ marginTop: 12 }}>
        <Text strong style={{ fontSize: 12, color: T.t2 }}>최근 작성 {LABEL[type]}</Text>
        <Space wrap size={[6, 6]} style={{ marginTop: 6 }}>
          {(recent?.items ?? []).slice(0, 20).map((r) => (
            <a key={r.id} onClick={() => setDay(dayjs(String(r.reportDate)))} style={{ fontSize: 12, color: String(r.reportKey) === key ? T.primary : T.t3 }}>
              {String(r.reportKey)}{r.title ? ` ${String(r.title)}` : ''}
            </a>
          ))}
          {!recent?.items?.length && <Text type="secondary" style={{ fontSize: 12 }}>없음</Text>}
        </Space>
      </div>
    </div>
  );
}
