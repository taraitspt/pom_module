-- V4 (2026-10-19): 설비 정비 이슈 — 설비기술파트 정비 일지. 현황판 세 개(설비기술·생산운영팀·인쇄파트)가 같은 테이블을 본다.
-- 아티팩트에 박혀 있던 스냅샷(1,110건)은 출처가 없어 가져오지 않는다(사용자 원칙 2026-10-19: ERP 또는 직접 입력만). 빈 테이블로 시작한다.
CREATE TABLE board_maint_issue (
    maint_id     BIGINT        NOT NULL AUTO_INCREMENT,
    issue_date   DATE          NOT NULL COMMENT '등록(발생)일',
    process_cd   VARCHAR(20)   NOT NULL COMMENT 'plate/sheet/web/saddle/perfect/coating/fold/utility/etc — BoardScope 공정 코드 + 접지·유틸리티·기타',
    process_nm   VARCHAR(40)   NULL     COMMENT '원본 표기(매엽·국윤전·4*6윤전·시설/공통 …)',
    equipment_cd VARCHAR(30)   NULL     COMMENT 'ERP 설비코드(PM_EQ_SDTL, T01…) — 설비명이 한 대로 특정될 때만',
    equipment_nm VARCHAR(100)  NOT NULL COMMENT '설비명(원본 표기 — 국윤전1.2호 같은 복수 표기 포함)',
    part_nm      VARCHAR(100)  NULL     COMMENT '파트(유니트·급지·접지 …)',
    issue_type   VARCHAR(40)   NOT NULL COMMENT '계획정비/긴급정비/부품수리/구입/예비품/소모품교환/설치·도입/회의·소통/기타 …',
    content      VARCHAR(1000) NOT NULL COMMENT '내용',
    vendor_nm    VARCHAR(100)  NULL     COMMENT '업체(자체 포함)',
    status       VARCHAR(20)   NOT NULL COMMENT 'SCHEDULED 예정 / PROGRESS 진행중 / DONE 완료 / HOLD 보류',
    end_date     DATE          NULL     COMMENT '완료(종료)일',
    owner_nm     VARCHAR(50)   NULL     COMMENT '담당자(표시 이름)',
    note         VARCHAR(500)  NULL,
    source_board VARCHAR(40)   NULL     COMMENT '이관 출처 현황판 slug (직접 입력은 NULL)',
    legacy_id    VARCHAR(40)   NULL     COMMENT '원본 아티팩트 id',
    created_at   DATETIME      NULL,
    updated_at   DATETIME      NULL,
    created_id   VARCHAR(20)   NULL,
    updated_id   VARCHAR(20)   NULL,
    PRIMARY KEY (maint_id),
    KEY ix_maint_date (issue_date),
    KEY ix_maint_status (status, issue_date),
    KEY ix_maint_process (process_cd, issue_date),
    KEY ix_maint_eqp (equipment_cd)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='설비 정비 이슈 (설비기술파트 정비 일지)';
