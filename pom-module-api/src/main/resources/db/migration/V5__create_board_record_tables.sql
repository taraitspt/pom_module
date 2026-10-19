-- V5 (2026-10-19): 현황판 입력 테이블 — 사람이 관리하는 항목(ERP 에 없음). 전부 빈 테이블로 시작한다(아티팩트 스냅샷은 가져오지 않는다).
-- 공통 CRUD: BoardRecordController /api/boards/records/{kind} (BoardRecordKind 가 테이블·필터·권한을 정한다).

-- 업무·과제 (생산운영팀·인쇄파트 '업무·과제' 탭, 외주협력팀 '일일 업무') — board_slug 로 현황판을 가른다
CREATE TABLE board_work_item (
    item_id      BIGINT        NOT NULL AUTO_INCREMENT,
    board_slug   VARCHAR(40)   NOT NULL COMMENT 'production-ops / print-part / outsourcing / equipment-tech',
    process_cd   VARCHAR(20)   NULL     COMMENT '공정 코드(plate/sheet/web/saddle/perfect/coating/fold/utility/etc) 또는 파트',
    category     VARCHAR(20)   NULL     COMMENT '인원/업무/점검/조사/안전/정비/품질 …',
    title        VARCHAR(300)  NOT NULL COMMENT '업무 내용',
    detail       VARCHAR(1000) NULL     COMMENT '진행사항·실적·결과',
    partner_nm   VARCHAR(100)  NULL     COMMENT '협력사·프로젝트',
    owner_nm     VARCHAR(50)   NULL     COMMENT '담당자',
    start_date   DATE          NULL,
    due_date     DATE          NULL     COMMENT '완료 예정',
    end_date     DATE          NULL     COMMENT '완료일',
    status       VARCHAR(20)   NOT NULL DEFAULT 'TODO' COMMENT 'TODO 예정 / PROGRESS 진행 / DONE 완료 / HOLD 보류',
    note         VARCHAR(500)  NULL,
    created_at   DATETIME      NULL,
    updated_at   DATETIME      NULL,
    created_id   VARCHAR(20)   NULL,
    updated_id   VARCHAR(20)   NULL,
    PRIMARY KEY (item_id),
    KEY ix_work_board (board_slug, status, due_date),
    KEY ix_work_date (start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='현황판 업무·과제';

-- 안전사고 사례
CREATE TABLE board_safety_accident (
    accident_id   BIGINT        NOT NULL AUTO_INCREMENT,
    accident_date DATE          NOT NULL COMMENT '발생일',
    person_nm     VARCHAR(50)   NOT NULL COMMENT '팀원',
    dept_nm       VARCHAR(50)   NULL     COMMENT '소속(표시)',
    process_cd    VARCHAR(20)   NULL,
    summary       VARCHAR(500)  NOT NULL COMMENT '사고 요약',
    followup      VARCHAR(1000) NULL     COMMENT '후속 확인사항',
    status        VARCHAR(20)   NOT NULL DEFAULT 'TREATING' COMMENT 'TREATING 치료중 / DONE 치료완료',
    created_at    DATETIME      NULL,
    updated_at    DATETIME      NULL,
    created_id    VARCHAR(20)   NULL,
    updated_id    VARCHAR(20)   NULL,
    PRIMARY KEY (accident_id),
    KEY ix_acc_date (accident_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='안전사고 사례';

-- 안전 조치사항
CREATE TABLE board_safety_action (
    action_id    BIGINT        NOT NULL AUTO_INCREMENT,
    action_date  DATE          NULL     COMMENT '조치일(예정이면 NULL)',
    process_cd   VARCHAR(20)   NULL,
    equipment_nm VARCHAR(100)  NULL,
    issue        VARCHAR(500)  NOT NULL COMMENT '문제점',
    action       VARCHAR(1000) NULL     COMMENT '조치사항',
    owner_nm     VARCHAR(50)   NULL,
    status       VARCHAR(20)   NOT NULL DEFAULT 'PLANNED' COMMENT 'PLANNED 예정 / DONE 완료',
    created_at   DATETIME      NULL,
    updated_at   DATETIME      NULL,
    created_id   VARCHAR(20)   NULL,
    updated_id   VARCHAR(20)   NULL,
    PRIMARY KEY (action_id),
    KEY ix_sact_date (action_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='안전 조치사항';

-- 3정5S 활동 (설비기술)
CREATE TABLE board_s3s_activity (
    s3s_id        BIGINT        NOT NULL AUTO_INCREMENT,
    activity_date DATE          NOT NULL COMMENT '완료일',
    improve_no    VARCHAR(20)   NULL     COMMENT '개선번호(예 202601-1)',
    dept_nm       VARCHAR(50)   NULL,
    person_nm     VARCHAR(50)   NULL     COMMENT '담당자',
    activity_type VARCHAR(40)   NULL     COMMENT '환경개선/정리정돈/안전 …',
    content       VARCHAR(500)  NOT NULL,
    created_at    DATETIME      NULL,
    updated_at    DATETIME      NULL,
    created_id    VARCHAR(20)   NULL,
    updated_id    VARCHAR(20)   NULL,
    PRIMARY KEY (s3s_id),
    KEY ix_s3s_date (activity_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='3정5S 활동';

-- 구입·수리 비용 (설비기술 구입수리 현황)
CREATE TABLE board_maint_cost (
    cost_id      BIGINT        NOT NULL AUTO_INCREMENT,
    cost_date    DATE          NOT NULL COMMENT '기안·증빙일',
    process_cd   VARCHAR(20)   NULL,
    equipment_nm VARCHAR(100)  NULL,
    cost_type    VARCHAR(20)   NOT NULL COMMENT 'PURCHASE 구입 / PART_REPAIR 부품수리 / REPAIR 수리',
    item_nm      VARCHAR(300)  NOT NULL COMMENT '품목·내용',
    vendor_nm    VARCHAR(100)  NULL,
    amount       BIGINT        NOT NULL DEFAULT 0 COMMENT '원',
    maint_type   VARCHAR(20)   NULL     COMMENT 'PLANNED 계획정비 / URGENT 긴급정비 (정비 시간 집계용)',
    hours        DECIMAL(6,1)  NULL     COMMENT '정비 시간(h)',
    self_yn      CHAR(1)       NULL     COMMENT 'Y 자체 / N 업체',
    maint_id     BIGINT        NULL     COMMENT '연결된 정비 이슈(board_maint_issue)',
    note         VARCHAR(500)  NULL,
    created_at   DATETIME      NULL,
    updated_at   DATETIME      NULL,
    created_id   VARCHAR(20)   NULL,
    updated_id   VARCHAR(20)   NULL,
    PRIMARY KEY (cost_id),
    KEY ix_cost_date (cost_date),
    KEY ix_cost_type (cost_type, cost_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='설비 구입·수리 비용';

-- 보고서 (일일/주간/월간 텍스트)
CREATE TABLE board_report_doc (
    report_id   BIGINT       NOT NULL AUTO_INCREMENT,
    board_slug  VARCHAR(40)  NOT NULL,
    report_type VARCHAR(10)  NOT NULL COMMENT 'DAILY / WEEKLY / MONTHLY',
    report_key  VARCHAR(10)  NOT NULL COMMENT 'DAILY=YYYY-MM-DD, WEEKLY=주 시작일, MONTHLY=YYYY-MM',
    report_date DATE         NOT NULL COMMENT '정렬·기간 필터용(= report_key 의 날짜)',
    title       VARCHAR(200) NULL,
    content     TEXT         NOT NULL,
    created_at  DATETIME     NULL,
    updated_at  DATETIME     NULL,
    created_id  VARCHAR(20)  NULL,
    updated_id  VARCHAR(20)  NULL,
    PRIMARY KEY (report_id),
    UNIQUE KEY uk_report (board_slug, report_type, report_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='현황판 보고서';

-- 프로젝트 + 일지
CREATE TABLE board_project (
    project_id  BIGINT        NOT NULL AUTO_INCREMENT,
    board_slug  VARCHAR(40)   NOT NULL,
    project_nm  VARCHAR(200)  NOT NULL,
    status      VARCHAR(20)   NOT NULL DEFAULT 'PLANNED' COMMENT 'PLANNED 준비 / PROGRESS 진행중 / DONE 완료 / HOLD 보류',
    start_date  DATE          NULL,
    end_date    DATE          NULL,
    owner_nm    VARCHAR(50)   NULL,
    summary     VARCHAR(2000) NULL     COMMENT '개요',
    created_at  DATETIME      NULL,
    updated_at  DATETIME      NULL,
    created_id  VARCHAR(20)   NULL,
    updated_id  VARCHAR(20)   NULL,
    PRIMARY KEY (project_id),
    KEY ix_project_board (board_slug, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='현황판 프로젝트';

CREATE TABLE board_project_log (
    log_id      BIGINT        NOT NULL AUTO_INCREMENT,
    project_id  BIGINT        NOT NULL,
    log_date    DATE          NOT NULL,
    workers     INT           NULL     COMMENT '작업 인원',
    content     VARCHAR(2000) NOT NULL COMMENT '작업 실적·이슈',
    next_plan   VARCHAR(1000) NULL     COMMENT '익일 계획',
    created_at  DATETIME      NULL,
    updated_at  DATETIME      NULL,
    created_id  VARCHAR(20)   NULL,
    updated_id  VARCHAR(20)   NULL,
    PRIMARY KEY (log_id),
    KEY ix_plog (project_id, log_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='프로젝트 일자별 일지';
