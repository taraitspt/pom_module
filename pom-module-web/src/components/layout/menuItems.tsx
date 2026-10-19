import React from 'react';
import {
  // HomeOutlined, InfoCircleOutlined, ScheduleOutlined, FundOutlined — 영업 메뉴 주석과 함께 보관
  SettingOutlined,
  FilePdfOutlined,
  BuildOutlined,
  NotificationOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import type { Role } from '@/types/auth';
import { DASHBOARDS, dashboardPath } from '@/pages/dashboards/dashboardRegistry';

export interface AppMenuItem {
  key: string;
  icon?: React.ReactNode;
  label: string;
  roles?: Role[];
  /** 역할과 무관하게 메뉴 접근을 허용할 부서코드. */
  allowedDeptCds?: number[];
  /** 이 부서(dept_cd)에 속한 사용자에겐 메뉴를 숨긴다. */
  hideForDepts?: number[];
  children?: AppMenuItem[];
}

/** 시트 #1 0511_0 — 사이드바와 상단 메뉴가 동일 정의를 공유한다. */
export const MENU_ITEMS: AppMenuItem[] = [
  // [2026-10-16 생산관리시스템 전환] 매출관리 — 주석 보관. 매출현황(월매출계획 대비)은 삭제.
  // {
    // // 매출관리 (2026-10-06 상단 메뉴 통합). 첫 화면 = 매출현황(계획 대비, '/'). 2026-09-18 기존 홈 대시보드는 폐기.
    // // 매출리스트(/stats/sales-list)는 메뉴에 두지 않고 매출현황 안 버튼으로 연다 — 권한 키는 그대로라 버튼 노출도 그 키를 따른다.
    // // 매출 후 잔여재고·수주 담당팀 점검·운송정보 부서 점검은 '수주 점검' 한 항목(탭, ?tab=leftover|so-cc). 옛 경로는 리다이렉트.
    // key: 'sales',
    // icon: <FundOutlined />,
    // label: '매출관리',
    // children: [
      // { key: '/stats/data-check', label: '수주 점검' },
    // ],
  // },
  // [2026-10-16 생산관리시스템 전환] 정보관리(영업) — 주석 보관. 월매출계획은 삭제.
  // {
    // key: 'info',
    // icon: <InfoCircleOutlined />,
    // label: '정보관리',
    // children: [
      // // 2026-09-18 당분간 미사용 — 필요 시 주석 해제 (routes/index.tsx 의 라우트·lazy import 도 같이)
      // // { key: '/info/biz-owners', label: '사업자관리' },
      // // { key: '/info/customers', label: '고객관리' },
      // // { key: '/info/sales-persons', label: '영업담당자관리' },
      // // 2026-10-15 관리자 → 정보관리로 이동(사용자 요청). 경로·권한 키는 그대로.
      // { key: '/admin/receivable-aging', label: '채권연령분석' },
      // // 2026-09-18 부서/AM 목표입력(goal_mst)은 월매출계획으로 대체 — 필요 시 주석 해제
      // // { key: '/info/goal', label: '목표입력' },
    // ],
  // },
  // [2026-10-16 생산관리시스템 전환] 영업관리(거래처·영업활동·수주 추진) — 거래처 내용은 나중에 쓸 수 있어 주석으로 보관.
  // {
    // key: 'activity',
    // icon: <ScheduleOutlined />,
    // label: '영업관리',
    // children: [
      // { key: '/activity/attention', label: '관리 필요 거래처' },
      // { key: '/deals', label: '수주 추진' },
      // { key: '/activity/calendar', label: '영업활동 캘린더' },
      // { key: '/activity/board', label: '일자별 영업현황' },
      // { key: '/activity/list', label: '영업활동 이력' },
      // { key: '/activity/partner', label: '거래처 카드' },
    // ],
  // },
  {
    // TPS(공장 1000) 생산 — ERP 조회 전용. 권한 키는 MenuCatalog 에 등록.
    key: 'production',
    icon: <BuildOutlined />,
    label: '생산현황',
    children: [
      { key: '/production/plan', label: '생산계획현황' },
      { key: '/production/dashboard', label: '생산계획 대시보드' },
      { key: '/production/equipment-perf', label: '설비별 작업실적' },
      { key: '/production/equipment-board', label: '설비 가동 현황' },
      { key: '/production/order-progress', label: '주문진행현황' },
      { key: '/production/plan-register', label: '생산계획조회' },
      { key: '/production/schedule', label: '생산일정현황' },
      { key: '/production/lifecycle', label: '주문 타임라인' },
    ],
  },
  {
    // 현황판(2026-10-19) — 부서별 아티팩트 대시보드를 옮긴 것. 목록은 pages/dashboards/dashboardRegistry.ts.
    // 권한 키(/dashboards/{slug})는 백엔드 MenuCatalog 에 등록, 켜고 끄기는 관리자 > 권한 관리.
    key: 'dashboards',
    icon: <DashboardOutlined />,
    label: '현황판',
    children: DASHBOARDS.map((d) => ({ key: dashboardPath(d.slug), label: d.label })),
  },
  // 2026-10-19 스쿼시: 옛 '데이터 분석'(거래처별 월매출·매출증감·디자인매출)·'수익성 분석'(GRP수익비용대응·외주 마진율) 메뉴는
  // 화면·서버와 함께 삭제했다(옛 SM 로컬 매출 테이블 기반). 원본은 CRM 저장소.
  // 공지사항 게시판(2026-10-16) — 업데이트 안내. 팝업 기간을 정하면 로그인 후 팝업(NoticePopup). 쓰기는 ADMIN.
  { key: '/notices', icon: <NotificationOutlined />, label: '공지사항' },
  { key: '/tools/pdf', icon: <FilePdfOutlined />, label: 'PDF 변환' },
  {
    key: 'admin',
    icon: <SettingOutlined />,
    label: '관리자',
    roles: ['ADMIN', 'FINANCE'],
    children: [
      { key: '/admin/active-users', label: '실시간 접속 현황', roles: ['ADMIN'] },
      { key: '/admin/erp-sync', label: 'ERP 동기화', roles: ['ADMIN'] },
      // 2026-10-06 월마감 관리·공통코드 관리는 쓰지 않아 뺐다(사용자 결정). 코드는 남아 있다 — 되살리려면 여기와 routes/index.tsx, MenuCatalog 를 함께 푼다.
      // { key: '/admin/closing', label: '월마감 관리', roles: ['ADMIN', 'FINANCE'] },
      // { key: '/admin/common-codes', label: '공통코드 관리', roles: ['ADMIN'] },
      { key: '/admin/users', label: '사용자 관리', roles: ['ADMIN'] },
      { key: '/admin/departments', label: '부서 관리', roles: ['ADMIN'] },
      { key: '/admin/menu-permissions', label: '권한 관리', roles: ['ADMIN'] },
    ],
  },
];

/**
 * 서버에서 받은 허용 메뉴키로 걸러낸다 (관리자 → 권한 관리에서 설정).
 * allowedKeys 가 없으면(아직 못 받았거나 구버전 백엔드) 아래 filterMenuByRole 로 폴백한다.
 */
export function filterMenuByKeys(items: AppMenuItem[], allowedKeys: Set<string>): AppMenuItem[] {
  return items
    .map((item) => {
      if (item.children) {
        const children = filterMenuByKeys(item.children, allowedKeys);
        return children.length === 0 ? null : { ...item, children };
      }
      return allowedKeys.has(item.key) ? item : null;
    })
    .filter(Boolean) as AppMenuItem[];
}

export function filterMenuByRole(items: AppMenuItem[], role?: Role, deptCd?: number | null): AppMenuItem[] {
  return items
    // 역할 조건(roles) + 부서 숨김(hideForDepts) 둘 다 통과해야 노출.
    .filter((item) => ((!item.roles || (role != null && item.roles.includes(role)))
        || (deptCd != null && item.allowedDeptCds?.includes(deptCd)))
      && !(deptCd != null && item.hideForDepts?.includes(deptCd)))
    .map((item) => {
      if (item.children) {
        const filtered = filterMenuByRole(item.children, role, deptCd);
        if (filtered.length === 0) return null;
        return { ...item, children: filtered };
      }
      return item;
    })
    .filter(Boolean) as AppMenuItem[];
}

/** 현재 path 로 활성 topkey 결정 (사이드바 openKeys 및 헤더 selectedKeys 공통 사용). */
export function getActiveTopKey(pathname: string): string {
  // [2026-10-16 생산관리시스템 전환] 영업 메뉴 주석 — 되살리면 아래 줄도 함께 푼다.
  // if (pathname.startsWith('/stats/sales-list')) return 'sales';
  // if (pathname.startsWith('/stats/data-check') || pathname.startsWith('/stats/stock-leftover') || pathname.startsWith('/stats/so-cc-check')) return 'sales';
  // if (pathname.startsWith('/activity')) return 'activity';
  // if (pathname.startsWith('/deals')) return 'activity';
  if (pathname.startsWith('/tools/pdf')) return '/tools/pdf';
  if (pathname.startsWith('/production')) return 'production';
  if (pathname.startsWith('/dashboards')) return 'dashboards';
  // 수익성 분석 화면들은 경로가 /stats 지만 활성키는 'profit'.
  // (아래 일반 /stats 분기보다 먼저 판정해야 함)
  if (pathname.startsWith('/stats/grp-profit')) return 'profit';
  if (pathname.startsWith('/stats/order-margin')) return 'profit';
  if (pathname.startsWith('/stats/vendor-margin')) return 'profit';
  if (pathname.startsWith('/info')) return 'info';
  if (pathname.startsWith('/stats')) return 'stats';
  if (pathname.startsWith('/admin/receivable-aging')) return 'info';   // 메뉴는 정보관리 아래(2026-10-15)
  if (pathname.startsWith('/admin')) return 'admin';
  return '';
}
