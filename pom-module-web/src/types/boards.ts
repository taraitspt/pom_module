/**
 * 현황판 데이터 API 타입 — 서버 `boards/dto/PerfBoardDto` 와 같다.
 * 월 배열은 index 0 = 1월. 실적이 없는 달은 null.
 */

export interface EquipmentPerf {
  eqpCd: string;
  name: string;
  splitCode: string | null;
  production: number;
  revenue: number;
  tpi: number | null;
  quality: number;
  qcost: number;
  tpiMonthly: (number | null)[];
  productionMonthly: (number | null)[];
  revenueMonthly: (number | null)[];
}

export interface SplitPerf {
  name: string;
  unit: string;
  production: (number | null)[];
  revenue: (number | null)[];
}

export interface ProcessPerf {
  code: string;
  name: string;
  unit: string;
  hasTpi: boolean;
  tpi: (number | null)[];
  quality: number[];
  cost: number[];
  production: (number | null)[];
  revenue: (number | null)[];
  equipments: EquipmentPerf[];
  splits: Record<string, SplitPerf>;
}

export interface QualityIssue {
  nstbNo: string;
  date: string;        // YYYY-MM-DD
  month: string;       // YYYY-MM
  processCode: string;
  processName: string;
  acptTpCd: string;
  acptTpNm: string;
  nstbDcCd: string;
  nstbDcNm: string;
  eqpCd: string;
  eqpNm: string;
  orderNo: string;
  orderNm: string;
  partnerNm: string;
  inoutcomFg: string;
  osrcPartnerNm: string;
  procAmt: number;
  deptNm: string;
  personNm: string;
  title: string;
  content: string;
}

export interface KpiTarget {
  metric: string;      // TPI / QUALITY_COUNT / QUALITY_COST / S3S / PLANNED_MAINT_RATE
  scope: string;       // ALL 또는 공정 코드
  value: number;
  note: string | null;
}

export interface PerfBoard {
  slug: string;
  year: number;
  lastMonth: number;
  processes: ProcessPerf[];
  qualityIssues: QualityIssue[];
  targets: KpiTarget[];
  generatedAt: string;
}
