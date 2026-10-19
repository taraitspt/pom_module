import apiClient from './client';
import type { ApiResponse } from '@/types/common';
import type { LeftoverRow } from '@/types/stockLeftover';
import type { SoCcRow } from '@/types/soCcCheck';
import type { TransportRow } from '@/types/transportCheck';
import type { PodProductionRow, PodProductionDetail, PodProductionSpecRow } from '@/types/stats';

// 2026-10-19 스쿼시: 옛 SM 로컬 테이블(sales_mst/order_mst/po_*)을 읽던 통계 API(대시보드·팀 예측·목표 대비·품목별·마진율·
// 거래처별 월매출·디자인매출)는 서버(StatsService)와 함께 삭제. 남은 것은 전부 ERP(Oracle) 조회 전용.

export const getPodProductionRows = (params: {
  startDate: string;
  endDate: string;
  workPlaceCd?: string;
  itemType?: string;
  salesDepartmentCd?: string;
  salesEmployee?: string;
  keyword?: string;
}) => apiClient.get<ApiResponse<PodProductionRow[]>>('/stats/pod-production', { params });

export const getPodProductionDetails = (orderNo: string, orderSq: number) =>
  apiClient.get<ApiResponse<PodProductionDetail[]>>('/stats/pod-production/details', {
    params: { orderNo, orderSq },
  });

/** POD 전체 작업사양 (주문일 기준 flat) — G0500. */
export const getPodProductionSpecs = (params: { startDate: string; endDate: string }) =>
  apiClient.get<ApiResponse<PodProductionSpecRow[]>>('/stats/pod-production/specs', { params });

/** 채권연령분석 — baseDate(YYYY-MM-DD) 기준 미반제 잔액·연령버킷. pcCds 생략 시 1000,9000,8000 전부. */
export const getReceivableAging = (baseDate: string) =>
  apiClient.get<ApiResponse<import('@/types/stats').ReceivableAgingDto>>('/stats/receivable-aging', {
    params: { baseDate },
  });

/** 매출 후 잔여재고 — 매출 등록된 배치(주문번호-순번) 중 오늘 기준 재고 > 0. billFrom/billTo 는 마지막 매출일 범위(선택). 행은 Map(camelCase). */
export const getStockLeftover = (params: { billFrom?: string; billTo?: string }) =>
  apiClient.get<ApiResponse<LeftoverRow[]>>('/stats/stock-leftover', { params, timeout: 120_000 });

/** 수주 담당팀 점검 — 수주일 기간(최대 93일), 수주마다 비용센터 vs 담당자 소속 판정(ccMatch). 행은 Map(camelCase). */
export const getSoCcCheck = (params: { startDate: string; endDate: string }) =>
  apiClient.get<ApiResponse<SoCcRow[]>>('/stats/so-cc-check', { params, timeout: 120_000 });
/** 운송정보 부서 점검 — 운송정보 등록일 기간(최대 93일), 행마다 부서 비용센터 vs 수주 라인 비용센터 판정(deptMatch). */
export const getTransportDeptCheck = (params: { startDate: string; endDate: string }) =>
  apiClient.get<ApiResponse<TransportRow[]>>('/stats/transport-dept-check', { params, timeout: 120_000 });
