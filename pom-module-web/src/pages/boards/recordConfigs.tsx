import type { FieldDef } from './RecordPanel';
import { T } from '@/theme/designTokens';

/** 입력 테이블(V5) 필드 정의 — 서버 엔티티 속성명과 같아야 한다. */

export const PROCESS_OPTIONS = [
  { value: 'plate', label: '제판' }, { value: 'sheet', label: '매엽' }, { value: 'web', label: '윤전' }, { value: 'saddle', label: '중철' },
  { value: 'perfect', label: '무선' }, { value: 'coating', label: '코팅·톰슨' }, { value: 'fold', label: '접지' },
  { value: 'utility', label: '유틸리티' }, { value: 'etc', label: '기타' },
];

const WORK_STATUS = [
  { value: 'TODO', label: '예정', color: T.bl }, { value: 'PROGRESS', label: '진행', color: T.wa },
  { value: 'DONE', label: '완료', color: T.ok }, { value: 'HOLD', label: '보류', color: T.er },
];

export const WORK_ITEM_FIELDS: FieldDef[] = [
  { name: 'startDate', label: '시작일', type: 'date', required: true, width: 100 },
  { name: 'processCd', label: '공정·파트', type: 'select', options: PROCESS_OPTIONS, width: 90 },
  { name: 'category', label: '구분', type: 'select', tags: true, width: 80, options: ['인원', '업무', '점검', '조사', '안전', '정비', '품질', '회의'].map((v) => ({ value: v, label: v })) },
  { name: 'title', label: '업무 내용', type: 'textarea', required: true, ellipsis: true },
  { name: 'detail', label: '진행사항·결과', type: 'textarea', ellipsis: true },
  { name: 'partnerNm', label: '협력사·프로젝트', type: 'text', width: 120 },
  { name: 'ownerNm', label: '담당', type: 'text', width: 80 },
  { name: 'dueDate', label: '완료 예정', type: 'date', width: 100 },
  { name: 'endDate', label: '완료일', type: 'date', width: 100 },
  { name: 'status', label: '상태', type: 'select', required: true, options: WORK_STATUS, width: 80 },
  { name: 'note', label: '비고', type: 'text', width: 0 },
];

export const SAFETY_ACCIDENT_FIELDS: FieldDef[] = [
  { name: 'accidentDate', label: '발생일', type: 'date', required: true, width: 100 },
  { name: 'personNm', label: '팀원', type: 'text', required: true, width: 90 },
  { name: 'deptNm', label: '소속', type: 'text', width: 100 },
  { name: 'processCd', label: '공정', type: 'select', options: PROCESS_OPTIONS, width: 80 },
  { name: 'summary', label: '사고 요약', type: 'textarea', required: true, ellipsis: true },
  { name: 'followup', label: '후속 확인사항', type: 'textarea', ellipsis: true },
  { name: 'status', label: '상태', type: 'select', required: true, width: 90, options: [{ value: 'TREATING', label: '치료중', color: T.wa }, { value: 'DONE', label: '치료완료', color: T.ok }] },
];

export const SAFETY_ACTION_FIELDS: FieldDef[] = [
  { name: 'actionDate', label: '조치일', type: 'date', width: 100 },
  { name: 'processCd', label: '공정', type: 'select', options: PROCESS_OPTIONS, width: 80 },
  { name: 'equipmentNm', label: '설비', type: 'text', width: 110 },
  { name: 'issue', label: '문제점', type: 'textarea', required: true, ellipsis: true },
  { name: 'action', label: '조치사항', type: 'textarea', ellipsis: true },
  { name: 'ownerNm', label: '담당', type: 'text', width: 80 },
  { name: 'status', label: '상태', type: 'select', required: true, width: 80, options: [{ value: 'PLANNED', label: '예정', color: T.bl }, { value: 'DONE', label: '완료', color: T.ok }] },
];

export const S3S_FIELDS: FieldDef[] = [
  { name: 'activityDate', label: '완료일', type: 'date', required: true, width: 100 },
  { name: 'improveNo', label: '개선번호', type: 'text', width: 100 },
  { name: 'deptNm', label: '부서', type: 'text', width: 90 },
  { name: 'personNm', label: '담당자', type: 'text', width: 80 },
  { name: 'activityType', label: '유형', type: 'select', tags: true, width: 90, options: ['환경개선', '정리정돈', '안전', '표준화', '청소', '기타'].map((v) => ({ value: v, label: v })) },
  { name: 'content', label: '내용', type: 'textarea', required: true, ellipsis: true },
];

export const MAINT_COST_FIELDS: FieldDef[] = [
  { name: 'costDate', label: '일자', type: 'date', required: true, width: 100 },
  { name: 'costType', label: '구분', type: 'select', required: true, width: 90, options: [{ value: 'PURCHASE', label: '구입', color: T.bl }, { value: 'PART_REPAIR', label: '부품수리', color: T.pu }, { value: 'REPAIR', label: '수리', color: T.wa }] },
  { name: 'processCd', label: '공정', type: 'select', options: PROCESS_OPTIONS, width: 80 },
  { name: 'equipmentNm', label: '설비', type: 'text', width: 110 },
  { name: 'itemNm', label: '품목·내용', type: 'textarea', required: true, ellipsis: true },
  { name: 'vendorNm', label: '업체', type: 'text', width: 110 },
  { name: 'amount', label: '금액(원)', type: 'number', required: true, width: 120 },
  { name: 'maintType', label: '정비 유형', type: 'select', width: 90, options: [{ value: 'PLANNED', label: '계획정비' }, { value: 'URGENT', label: '긴급정비' }] },
  { name: 'hours', label: '정비 시간(h)', type: 'number', width: 90 },
  { name: 'selfYn', label: '자체/업체', type: 'select', width: 80, options: [{ value: 'Y', label: '자체' }, { value: 'N', label: '업체' }] },
  { name: 'note', label: '비고', type: 'text', width: 0 },
];

export const PROJECT_FIELDS: FieldDef[] = [
  { name: 'projectNm', label: '프로젝트', type: 'text', required: true, width: 220 },
  { name: 'status', label: '상태', type: 'select', required: true, width: 90, options: [{ value: 'PLANNED', label: '준비', color: T.bl }, { value: 'PROGRESS', label: '진행중', color: T.wa }, { value: 'DONE', label: '완료', color: T.ok }, { value: 'HOLD', label: '보류', color: T.er }] },
  { name: 'startDate', label: '시작', type: 'date', width: 100 },
  { name: 'endDate', label: '종료', type: 'date', width: 100 },
  { name: 'ownerNm', label: '담당', type: 'text', width: 90 },
  { name: 'summary', label: '개요', type: 'textarea', ellipsis: true },
];

export const PROJECT_LOG_FIELDS: FieldDef[] = [
  { name: 'logDate', label: '일자', type: 'date', required: true, width: 100 },
  { name: 'workers', label: '작업 인원', type: 'number', width: 80 },
  { name: 'content', label: '작업 실적·이슈', type: 'textarea', required: true, ellipsis: true },
  { name: 'nextPlan', label: '익일 계획', type: 'textarea', ellipsis: true },
];
