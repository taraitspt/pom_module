import apiClient from './client';
import type { ApiResponse } from '@/types/common';
import type { KpiTarget, QualityIssue } from '@/types/boards';

/** 현황판 입력 테이블 공통 CRUD — 서버 BoardRecordController `/api/boards/records/{kind}`. */
export type RecordKind =
  | 'work-items' | 'safety-accidents' | 'safety-actions' | 's3s-activities' | 'maint-costs' | 'report-docs' | 'projects' | 'project-logs';

export interface RecordRow { id: number; [k: string]: unknown }

export interface RecordList<T = RecordRow> { items: T[]; statusCounts: Record<string, number>; total: number }

export interface RecordQuery {
  from?: string; to?: string; q?: string;
  /** 동등 필터 — 필드명=값(콤마로 여러 값) */
  [field: string]: string | undefined;
}

export const listRecords = <T = RecordRow>(kind: RecordKind, params: RecordQuery = {}) =>
  apiClient.get<ApiResponse<RecordList<T>>>(`/boards/records/${kind}`, { params }).then((r) => r.data.data);

export const createRecord = <T = RecordRow>(kind: RecordKind, body: Record<string, unknown>) =>
  apiClient.post<ApiResponse<T>>(`/boards/records/${kind}`, body).then((r) => r.data.data);

export const updateRecord = <T = RecordRow>(kind: RecordKind, id: number, body: Record<string, unknown>) =>
  apiClient.put<ApiResponse<T>>(`/boards/records/${kind}/${id}`, body).then((r) => r.data.data);

export const deleteRecord = (kind: RecordKind, id: number) =>
  apiClient.delete<ApiResponse<void>>(`/boards/records/${kind}/${id}`).then(() => undefined);

// ---------------------------------------------------------------- 인원

export interface Person { employeeNo: string; name: string; deptCd: number; deptNm: string; jobTitle: string | null; role: string; email: string | null; phone: string | null }
export interface DeptCount { deptCd: number; deptNm: string; upDeptCd: number | null; headcount: number }
export interface People { rootDeptCd: number; rootDeptNm: string; total: number; departments: DeptCount[]; people: Person[] }

export const getBoardPeople = (rootDeptCd?: number) =>
  apiClient.get<ApiResponse<People>>('/boards/people', { params: { rootDeptCd } }).then((r) => r.data.data);

// ---------------------------------------------------------------- 외주협력팀 (ERP)

export interface PurchaseOrder {
  poDate: string; poNo: string; partnerCd: string; partnerNm: string; empNo: string; empNm: string;
  orderNo: string; orderNm: string; planNo: string; purGrpCd: string; amount: number; lines: number; processes: string; confirmed: string;
}
export interface VendorAgg { partnerCd: string; partnerNm: string; owners: string; count: number; orders: number; amount: number; share: number; lastDate: string }
export interface OwnerAgg { empNo: string; empNm: string; vendors: number; count: number; orders: number; amount: number; share: number }
export interface DateAgg { date: string; count: number; amount: number }
export interface PurchaseOrderBoard {
  from: string; to: string; count: number; orders: number; vendors: number; amount: number;
  byVendor: VendorAgg[]; byOwner: OwnerAgg[]; byDate: DateAgg[]; rows: PurchaseOrder[];
}

export const getOutsourcingPurchaseOrders = (from: string, to: string) =>
  apiClient.get<ApiResponse<PurchaseOrderBoard>>('/boards/outsourcing/purchase-orders', { params: { from, to }, timeout: 120_000 }).then((r) => r.data.data);

export const getOutsourcingQuality = (year: number) =>
  apiClient.get<ApiResponse<QualityIssue[]>>('/boards/outsourcing/quality', { params: { year }, timeout: 120_000 }).then((r) => r.data.data);

/** KPI 목표 (board_kpi_target) — 현황판·연도별. */
export const getBoardTargets = (slug: string, year: number) =>
  apiClient.get<ApiResponse<KpiTarget[]>>(`/boards/${encodeURIComponent(slug)}/targets`, { params: { year } }).then((r) => r.data.data);
