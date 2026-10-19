/** 설비 정비 이슈 — 서버 `boards/dto/MaintIssueDto` 와 같다. */

export type MaintStatus = 'SCHEDULED' | 'PROGRESS' | 'DONE' | 'HOLD';

export interface MaintIssue {
  id: number;
  issueDate: string;        // YYYY-MM-DD
  processCd: string;        // plate/sheet/web/saddle/perfect/coating/fold/utility/etc
  processNm: string | null;
  equipmentCd: string | null;
  equipmentNm: string;
  partNm: string | null;
  issueType: string;
  content: string;
  vendorNm: string | null;
  status: MaintStatus;
  endDate: string | null;
  ownerNm: string | null;
  note: string | null;
  sourceBoard: string | null;
  updatedAt: string | null;
  updatedId: string | null;
}

export interface MaintIssueSave {
  issueDate: string;
  processCd: string;
  processNm?: string | null;
  equipmentCd?: string | null;
  equipmentNm: string;
  partNm?: string | null;
  issueType: string;
  content: string;
  vendorNm?: string | null;
  status: MaintStatus;
  endDate?: string | null;
  ownerNm?: string | null;
  note?: string | null;
}

export interface MaintListResponse {
  items: MaintIssue[];
  statusCounts: Record<MaintStatus, number>;
  total: number;
}

export interface CodeName { code: string; name: string }

export interface MaintMeta {
  processes: CodeName[];
  statuses: CodeName[];
  types: string[];
  vendors: string[];
  equipments: string[];
  parts: string[];
}

export interface MaintListParams {
  from?: string;
  to?: string;
  processes?: string[];
  statuses?: MaintStatus[];
  types?: string[];
  equipment?: string;
  vendor?: string;
  q?: string;
}

export const MAINT_STATUS_LABEL: Record<MaintStatus, string> = {
  SCHEDULED: '예정', PROGRESS: '진행중', DONE: '완료', HOLD: '보류',
};
export const MAINT_STATUS_ORDER: MaintStatus[] = ['SCHEDULED', 'PROGRESS', 'DONE', 'HOLD'];
