/**
 * 현황판 메뉴 (2026-10-19) — 부서별 claude.ai 아티팩트 대시보드를 POM 화면으로 다시 만든 것.
 * 데이터는 ERP 조회(출처 확인된 것만) 또는 POM 입력 테이블. 아티팩트 HTML 은 쓰지 않는다(원본은 docs/dashboards-original 참고용).
 * 메뉴를 늘릴 때: 여기 한 줄 + 백엔드 MenuCatalog + routes/index.tsx 의 화면 분기. menuItems·Breadcrumb 은 이 목록을 읽는다.
 */
export interface DashboardDef {
  slug: string;
  /** 메뉴·브레드크럼에 보이는 이름 */
  label: string;
  /** 원본 아티팩트(참고 출처 — 없앨 예정, 화면엔 안 씀) */
  source: string;
}

export const DASHBOARDS: DashboardDef[] = [
  {
    slug: 'production-ops',
    label: '생산운영팀 현황판',
    source: 'https://claude.ai/artifact/UYUcJgXzY433JgP4aYwkyN',
  },
  {
    slug: 'print-part',
    label: '인쇄파트 현황판',
    source: 'https://claude.ai/artifact/KXCW3xUceyDM9UWu2ZBgSS',
  },
  {
    slug: 'equipment-tech',
    label: '설비기술 대시보드',
    source: 'https://claude.ai/artifact/MUoeaDpDFp6PF8afDYF6YQ',
  },
  {
    slug: 'outsourcing',
    label: '외주협력팀 운영현황',
    source: 'https://claude.ai/artifact/1Vr8nCUX1YXxqJmwAEAHNu',
  },
];

export const dashboardPath = (slug: string) => `/dashboards/${slug}`;
