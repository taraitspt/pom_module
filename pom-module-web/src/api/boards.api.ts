import apiClient from './client';
import type { ApiResponse } from '@/types/common';
import type { PerfBoard } from '@/types/boards';

/** 현황판 실적·품질 (한 해). 서버가 ERP 를 10분 캐시하므로 첫 호출만 5~10초. refresh=true 면 다시 읽는다. */
export const getBoardPerf = (slug: string, year: number, refresh = false) =>
  apiClient
    .get<ApiResponse<PerfBoard>>(`/boards/${encodeURIComponent(slug)}/perf`, {
      params: { year, refresh: refresh || undefined },
      timeout: 120_000,
    })
    .then((res) => res.data.data);
