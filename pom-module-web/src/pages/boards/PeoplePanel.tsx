import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Col, Empty, Input, Row, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined } from '@ant-design/icons';
import { getBoardPeople, type Person } from '@/api/records.api';
import { T } from '@/theme/designTokens';
import { KpiTile } from './boardUi';

const { Text } = Typography;

/** 인원 탭 — POM 사용자·부서(ERP 동기화)로만. 휴가·연차는 POM 에서 관리하지 않는다. */
export default function PeoplePanel({ rootDeptCd }: { rootDeptCd?: number }) {
  const [dept, setDept] = useState<number | null>(null);
  const [q, setQ] = useState('');
  const { data, isLoading, isError } = useQuery({ queryKey: ['board-people', rootDeptCd], queryFn: () => getBoardPeople(rootDeptCd), staleTime: 5 * 60 * 1000 });
  const rows = useMemo(() => (data?.people ?? []).filter((p) => (dept == null || p.deptCd === dept) && (!q || p.name.includes(q) || p.deptNm.includes(q) || (p.jobTitle ?? '').includes(q))), [data, dept, q]);
  const depts = (data?.departments ?? []).filter((d) => d.headcount > 0);
  const columns: ColumnsType<Person> = [
    { title: '이름', dataIndex: 'name', width: 100 },
    { title: '부서', dataIndex: 'deptNm', width: 160 },
    { title: '직책', dataIndex: 'jobTitle', width: 90, render: (v: string | null) => v ?? '-' },
    { title: '사번', dataIndex: 'employeeNo', width: 100 },
    { title: '연락처', dataIndex: 'phone', width: 120, render: (v: string | null) => v ?? '-' },
    { title: '메일', dataIndex: 'email', ellipsis: true, render: (v: string | null) => v ?? '-' },
  ];
  if (isError) return <Empty description="인원 정보를 불러오지 못했습니다." />;
  return (
    <div>
      <Row gutter={[12, 12]}>
        <Col xs={12} md={6}><KpiTile label={`총 인원 (${data?.rootDeptNm ?? ''})`} value={String(data?.total ?? 0)} unit="명" sub={`${depts.length}개 부서 · 재직`} /></Col>
        <Col xs={24} md={18}>
          <Card variant="borderless" styles={{ body: { padding: '10px 14px' } }} style={{ borderRadius: 12, border: `1px solid ${T.border2}`, height: '100%' }}>
            <Text style={{ fontSize: 12, color: T.t3 }}>부서별 인원 — 클릭하면 아래 표를 좁힙니다</Text>
            <div style={{ marginTop: 6 }}>
              <Space wrap size={[6, 6]}>
                <Tag.CheckableTag checked={dept == null} onChange={() => setDept(null)} style={{ border: `1px solid ${T.border2}`, padding: '2px 8px' }}>전체 {data?.total ?? 0}</Tag.CheckableTag>
                {depts.map((d) => (
                  <Tag.CheckableTag key={d.deptCd} checked={dept === d.deptCd} onChange={() => setDept(dept === d.deptCd ? null : d.deptCd)} style={{ border: `1px solid ${T.border2}`, padding: '2px 8px' }}>
                    {d.deptNm} {d.headcount}
                  </Tag.CheckableTag>
                ))}
              </Space>
            </div>
          </Card>
        </Col>
      </Row>
      <Space style={{ margin: '12px 0' }}>
        <Input size="small" allowClear prefix={<SearchOutlined />} placeholder="이름·부서·직책" style={{ width: 220 }} onChange={(e) => setQ(e.target.value)} />
        <Text type="secondary" style={{ fontSize: 12 }}>휴가·연차는 POM 에서 관리하지 않습니다(그룹웨어 참조).</Text>
      </Space>
      <Table<Person> size="small" rowKey="employeeNo" loading={isLoading} columns={columns} dataSource={rows} pagination={{ pageSize: 30 }} />
    </div>
  );
}
