import apiClient from './client';
import type { ApiResponse } from '@/types/common';
import type { MaintIssue, MaintIssueSave, MaintListParams, MaintListResponse, MaintMeta, MaintStatus } from '@/types/maint';

const BASE = '/boards/maint-issues';

/** 정비 이슈 목록 — 필터는 전부 선택. 세 현황판 공유. */
export const listMaintIssues = (p: MaintListParams) =>
  apiClient
    .get<ApiResponse<MaintListResponse>>(BASE, {
      params: {
        from: p.from, to: p.to,
        processes: p.processes?.length ? p.processes.join(',') : undefined,
        statuses: p.statuses?.length ? p.statuses.join(',') : undefined,
        types: p.types?.length ? p.types.join(',') : undefined,
        equipment: p.equipment || undefined, vendor: p.vendor || undefined, q: p.q || undefined,
      },
    })
    .then((r) => r.data.data);

export const getMaintMeta = () => apiClient.get<ApiResponse<MaintMeta>>(`${BASE}/meta`).then((r) => r.data.data);

export const createMaintIssue = (body: MaintIssueSave) =>
  apiClient.post<ApiResponse<MaintIssue>>(BASE, body).then((r) => r.data.data);

export const updateMaintIssue = (id: number, body: MaintIssueSave) =>
  apiClient.put<ApiResponse<MaintIssue>>(`${BASE}/${id}`, body).then((r) => r.data.data);

export const changeMaintStatus = (id: number, status: MaintStatus, endDate?: string | null) =>
  apiClient.patch<ApiResponse<MaintIssue>>(`${BASE}/${id}/status`, { status, endDate: endDate ?? null }).then((r) => r.data.data);

export const deleteMaintIssue = (id: number) => apiClient.delete<ApiResponse<void>>(`${BASE}/${id}`).then(() => undefined);
