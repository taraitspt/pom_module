-- ============================================================
-- POM Module 스키마 V1 (2026-10-19 스쿼시)
-- ------------------------------------------------------------
-- GROW(SM) → CRM 을 거쳐 내려온 V1~V165 를 실제 쓰는 테이블만 남겨 하나로 합쳤다.
-- 주문(order_*)·외주발주(po_*)·매출(sales_mst/dtl)·정산·세금계산서(voucher_*)·비대면결제(untact_*)·
-- 위하고·api_client·옛 공지(notices)·teams_notification_log 등 엔티티 없는 25개 테이블은 만들지 않는다.
-- 이 파일 이전 이력이 필요하면 CRM 저장소(crm-module-api/src/main/resources/db/migration)를 본다.
--
-- 규칙: 모든 테이블 utf8mb4 / utf8mb4_unicode_ci (조인 컬럼 콜레이션을 맞추느라 V106·V136 을 또 만들지 않게).
-- ============================================================

-- ---------- 조직 · 사용자 · 인증 ----------

CREATE TABLE departments (
    company_cd        INT          NOT NULL,
    dept_cd           INT          NOT NULL,
    dept_nm           VARCHAR(100) NOT NULL,
    up_dept_cd        INT          NULL,
    erp_dept_code     VARCHAR(20)  NULL     COMMENT 'ERP 부서코드. NULL 이면 POM 에서 직접 추가한 부서(90001~)',
    cc_cd             VARCHAR(20)  NULL     COMMENT '비용센터코드',
    address_zip       VARCHAR(10)  NULL     COMMENT '부서 주소 우편번호',
    address_line1     VARCHAR(200) NULL     COMMENT '부서 기본주소',
    address_line2     VARCHAR(200) NULL     COMMENT '부서 상세주소',
    head_employee_no  VARCHAR(20)  NULL     COMMENT '부서장 사번 (관리자 지정, ERP 동기화가 건드리지 않음)',
    use_yn            VARCHAR(1)   NOT NULL DEFAULT 'Y',
    sort_order        INT          NULL     COMMENT '같은 상위 부서 안 표시 순서 (작을수록 위, 비면 부서 코드 순)',
    created_at        DATETIME     NULL,
    updated_at        DATETIME     NULL,
    created_id        VARCHAR(20)  NULL,
    updated_id        VARCHAR(20)  NULL,
    PRIMARY KEY (company_cd, dept_cd)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='부서 (ERP 동기화 + 조직도 설정)';

CREATE TABLE users (
    company_cd            INT          NOT NULL,
    id                    VARCHAR(20)  NOT NULL,
    employee_no           VARCHAR(20)  NOT NULL,
    password              VARCHAR(255) NOT NULL,
    name                  VARCHAR(50)  NOT NULL,
    phone                 VARCHAR(20)  NULL,
    email                 VARCHAR(100) NULL,
    dept_cd               INT          NULL,
    cc_cd                 VARCHAR(20)  NULL     COMMENT '비용센터코드',
    cc_nm                 VARCHAR(20)  NULL     COMMENT '비용센터명',
    role                  ENUM('ADMIN','EXECUTIVE','MANAGER','TEAM_LEADER','PART_LEADER','FINANCE','STAFF','SALES_SPT','CENTER_LEADER','PROD_SPT') NOT NULL,
    status                ENUM('ACTIVE','INACTIVE') NOT NULL,
    job_title             VARCHAR(50)  NULL     COMMENT '직책 (JobTitle.ALL — 관리자만 변경)',
    contact_phone         VARCHAR(20)  NULL     COMMENT '사무실 연락처',
    mfa_enabled           TINYINT(1)   NOT NULL DEFAULT 0,
    must_change_password  TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '임시 비밀번호 상태 — 변경 전까지 다른 API 403',
    failed_login_count    INT          NOT NULL DEFAULT 0 COMMENT '연속 로그인 실패 횟수 — 성공 시 0',
    locked_until          DATETIME     NULL     COMMENT '이 시각까지 로그인 차단. NULL 이면 잠기지 않음',
    initial_login_pending TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '첫 로그인 대기 — 1 이면 어떤 비밀번호로도 로그인 불가, Teams 1회용 비밀번호를 받아야 시작',
    created_at            DATETIME     NULL,
    updated_at            DATETIME     NULL,
    created_id            VARCHAR(20)  NULL,
    updated_id            VARCHAR(20)  NULL,
    PRIMARY KEY (company_cd, id),
    KEY idx_users_employee_no (company_cd, employee_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자 (ERP 사원 동기화 + 로그인 계정)';

CREATE TABLE auth_history (
    history_id   BIGINT       NOT NULL AUTO_INCREMENT,
    company_cd   INT          NOT NULL,
    user_id      VARCHAR(20)  NOT NULL,
    employee_no  VARCHAR(20)  NULL,
    event_type   VARCHAR(30)  NOT NULL COMMENT 'LOGIN/PASSWORD_CHANGED/LOGIN_FAILED/LOCKED/UNLOCKED',
    ip_address   VARCHAR(45)  NULL,
    user_agent   VARCHAR(500) NULL,
    occurred_at  DATETIME(6)  NOT NULL,
    PRIMARY KEY (history_id),
    KEY idx_auth_history_user (company_cd, user_id, occurred_at),
    KEY idx_auth_history_event (event_type, occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='로그인·비밀번호 변경·잠금 이력';

-- ---------- 권한 (두 축: 메뉴 접근 · 데이터 범위) ----------

CREATE TABLE menu_permission (
    menu_key   VARCHAR(80) NOT NULL COMMENT '메뉴 경로 또는 그룹키 (MenuCatalog / menuItems.tsx 의 key)',
    role       VARCHAR(20) NOT NULL COMMENT 'users.role',
    can_view   TINYINT(1)  NOT NULL DEFAULT 0,
    created_at DATETIME    NULL,
    updated_at DATETIME    NULL,
    created_id VARCHAR(20) NULL,
    updated_id VARCHAR(20) NULL,
    PRIMARY KEY (menu_key, role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='역할별 메뉴 접근 권한 — 없는 (menu_key, role) 은 허용 안 함';

CREATE TABLE resource_scope (
    resource   VARCHAR(30) NOT NULL COMMENT 'PomResource: ACTIVITY / DEAL / SALES_PLAN / SALES_STATS',
    role       VARCHAR(20) NOT NULL COMMENT 'users.role',
    scope      VARCHAR(10) NOT NULL COMMENT 'NONE / SELF / DEPT / ALL',
    created_at DATETIME    NULL,
    updated_at DATETIME    NULL,
    created_id VARCHAR(20) NULL,
    updated_id VARCHAR(20) NULL,
    PRIMARY KEY (resource, role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='역할별 데이터 범위';

-- ---------- 공통 ----------

CREATE TABLE common_code (
    company_cd INT          NOT NULL DEFAULT 1000,
    group_cd   VARCHAR(40)  NOT NULL,
    code       VARCHAR(40)  NOT NULL,
    label      VARCHAR(100) NOT NULL,
    sort_order INT          NOT NULL DEFAULT 0,
    use_yn     VARCHAR(1)   NOT NULL DEFAULT 'Y',
    wrk_div    VARCHAR(1)   NULL,
    created_at DATETIME     NULL,
    updated_at DATETIME     NULL,
    created_id VARCHAR(20)  NULL,
    updated_id VARCHAR(20)  NULL,
    PRIMARY KEY (company_cd, group_cd, code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='공통코드 (ERP 동기화가 DELIVERY_METHOD 를 채움, 관리 화면은 메뉴에서 뺌)';

CREATE TABLE closing_period (
    company_cd   INT          NOT NULL,
    plant_cd     INT          NOT NULL,
    closing_type VARCHAR(20)  NOT NULL COMMENT 'SALES/TAX',
    closing_ym   VARCHAR(6)   NOT NULL COMMENT 'YYYYMM',
    scheduled_dt DATETIME     NULL     COMMENT '예약 마감 시각(NULL 이면 즉시 마감)',
    closed_at    DATETIME     NULL     COMMENT '실제 마감 시각',
    closed_by    VARCHAR(20)  NULL     COMMENT '마감 처리자 사번',
    note         VARCHAR(500) NULL,
    created_at   DATETIME     NULL,
    updated_at   DATETIME     NULL,
    created_id   VARCHAR(20)  NULL,
    updated_id   VARCHAR(20)  NULL,
    PRIMARY KEY (company_cd, plant_cd, closing_type, closing_ym)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='월마감 (API·코드만 남음, 메뉴 없음)';

CREATE TABLE column_filter_preset (
    preset_id    BIGINT       NOT NULL AUTO_INCREMENT,
    company_cd   INT          NOT NULL,
    employee_no  VARCHAR(20)  NOT NULL COMMENT '소유자 사번(없으면 로그인 id)',
    page_path    VARCHAR(100) NOT NULL COMMENT '화면 라우트 경로',
    column_id    VARCHAR(50)  NOT NULL COMMENT '컬럼(th) id',
    filter_op    VARCHAR(20)  NOT NULL COMMENT 'CONTAINS/EQUALS/NOT_CONTAINS/GTE/LTE/IN',
    filter_value VARCHAR(200) NOT NULL,
    created_at   DATETIME     NULL,
    updated_at   DATETIME     NULL,
    created_id   VARCHAR(20)  NULL,
    updated_id   VARCHAR(20)  NULL,
    PRIMARY KEY (preset_id),
    KEY idx_column_filter_preset_owner (company_cd, employee_no, page_path, column_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='표 컬럼필터 프리셋';

CREATE TABLE file_info (
    company_cd    INT          NOT NULL,
    plant_cd      INT          NOT NULL,
    file_id       VARCHAR(50)  NOT NULL,
    notice_id     BIGINT       NULL     COMMENT '공지사항(notice.notice_id) 첨부',
    original_name VARCHAR(255) NOT NULL,
    stored_name   VARCHAR(255) NOT NULL,
    file_path     VARCHAR(500) NOT NULL,
    file_size     BIGINT       NULL     DEFAULT 0,
    content_type  VARCHAR(100) NULL,
    file_category VARCHAR(20)  NULL     COMMENT '파일 용도 (NOTICE)',
    created_at    DATETIME     NULL,
    updated_at    DATETIME     NULL,
    created_id    VARCHAR(20)  NULL,
    updated_id    VARCHAR(20)  NULL,
    PRIMARY KEY (company_cd, plant_cd, file_id),
    KEY idx_file_info_notice (company_cd, plant_cd, notice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='업로드 파일 메타 — POM 은 공지 첨부만';

-- ---------- 공지사항 ----------

CREATE TABLE notice (
    notice_id   BIGINT       NOT NULL AUTO_INCREMENT,
    category    VARCHAR(20)  NOT NULL DEFAULT 'NOTICE' COMMENT 'UPDATE 업데이트 / NOTICE 공지',
    title       VARCHAR(200) NOT NULL,
    content     TEXT         NOT NULL COMMENT '일반 텍스트(줄바꿈 유지) — HTML 은 그대로 글자로 보인다',
    pinned      TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '목록 상단 고정',
    popup_yn    TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '팝업 사용',
    popup_start DATE         NULL     COMMENT '팝업 시작일(포함)',
    popup_end   DATE         NULL     COMMENT '팝업 종료일(포함)',
    author_name VARCHAR(50)  NULL     COMMENT '작성자 표시 이름',
    created_at  DATETIME     NULL,
    updated_at  DATETIME     NULL,
    created_id  VARCHAR(20)  NULL,
    updated_id  VARCHAR(20)  NULL,
    PRIMARY KEY (notice_id),
    KEY ix_notice_popup (popup_yn, popup_start, popup_end)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='공지사항';

-- ---------- 웹 푸시 ----------

CREATE TABLE push_subscription (
    subscription_id BIGINT       NOT NULL AUTO_INCREMENT,
    company_cd      INT          NOT NULL,
    user_id         VARCHAR(20)  NOT NULL COMMENT 'users.id',
    endpoint        VARCHAR(500) NOT NULL COMMENT '푸시 서비스 엔드포인트 (Apple/Google/Mozilla)',
    p256dh          VARCHAR(200) NOT NULL COMMENT '클라이언트 공개키',
    auth_key        VARCHAR(100) NOT NULL COMMENT '클라이언트 인증 비밀',
    user_agent      VARCHAR(300) NULL,
    last_sent_at    DATETIME     NULL,
    fail_count      INT          NOT NULL DEFAULT 0,
    created_at      DATETIME     NULL,
    updated_at      DATETIME     NULL,
    created_id      VARCHAR(20)  NULL,
    updated_id      VARCHAR(20)  NULL,
    PRIMARY KEY (subscription_id),
    UNIQUE KEY uk_push_subscription_endpoint (endpoint),
    KEY ix_push_subscription_user (company_cd, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='웹 푸시 구독 (활동 알림)';

-- ---------- ERP 마스터 캐시 ----------

CREATE TABLE erp_items (
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    item_code  VARCHAR(30)  NOT NULL,
    item_name  VARCHAR(200) NOT NULL,
    item_spec  VARCHAR(200) NULL,
    unit       VARCHAR(20)  NULL,
    use_yn     VARCHAR(1)   NULL,
    synced_at  DATETIME     NOT NULL,
    created_at DATETIME     NOT NULL,
    updated_at DATETIME     NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_erp_items_item_code (item_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ERP 품목 마스터 캐시';

CREATE TABLE erp_sync_log (
    id            BIGINT      NOT NULL AUTO_INCREMENT,
    sync_type     VARCHAR(50) NOT NULL,
    direction     VARCHAR(10) NOT NULL,
    status        VARCHAR(20) NOT NULL,
    total_count   INT         NULL DEFAULT 0,
    success_count INT         NULL DEFAULT 0,
    fail_count    INT         NULL DEFAULT 0,
    error_message TEXT        NULL,
    started_at    DATETIME    NOT NULL,
    finished_at   DATETIME    NULL,
    created_at    DATETIME    NOT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ERP 마스터 동기화 로그';

CREATE TABLE business_owners (
    id                   BIGINT       NOT NULL AUTO_INCREMENT,
    company_cd           INT          NULL,
    partner_cd           VARCHAR(20)  NULL     COMMENT 'ERP 거래처코드 (CI_PARTNER_MST)',
    company_name         VARCHAR(100) NOT NULL,
    biz_no               VARCHAR(20)  NULL,
    biz_type             VARCHAR(50)  NULL,
    biz_item             VARCHAR(50)  NULL,
    address              VARCHAR(255) NULL,
    post_no              VARCHAR(20)  NULL,
    dtl_addr2            VARCHAR(255) NULL,
    subo_no              VARCHAR(20)  NULL,
    representative_name  VARCHAR(200) NULL,
    representative_email VARCHAR(200) NULL,
    representative_phone VARCHAR(50)  NULL,
    asgnr_tel_no         VARCHAR(50)  NULL,
    asgnr_dept_nm        VARCHAR(100) NULL,
    dept_cd              INT          NULL,
    created_at           DATETIME     NULL,
    updated_at           DATETIME     NULL,
    created_id           VARCHAR(20)  NULL,
    updated_id           VARCHAR(20)  NULL,
    PRIMARY KEY (id),
    KEY idx_biz_owner_company (company_cd, partner_cd)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='거래처(사업자) — ERP 거래처 동기화 대상';

-- ---------- 영업 데이터 (화면은 2026-10-16 주석 보관, 코드·테이블은 유지) ----------

CREATE TABLE sales_plan (
    company_cd   INT          NOT NULL DEFAULT 1000,
    plan_yy      VARCHAR(4)   NOT NULL,
    plan_mm      VARCHAR(2)   NOT NULL,
    sales_emp_id VARCHAR(20)  NOT NULL COMMENT '영업담당자 (users.id)',
    partner_cd   VARCHAR(20)  NOT NULL COMMENT 'ERP 거래처코드',
    dept_cd      INT          NULL     COMMENT '저장 시점 담당자 부서',
    partner_nm   VARCHAR(200) NULL     COMMENT '저장 시점 거래처명 (표시용 스냅샷)',
    labor_amt    BIGINT       NOT NULL DEFAULT 0 COMMENT '공임 계획금액',
    paper_amt    BIGINT       NOT NULL DEFAULT 0 COMMENT '용지 계획금액',
    created_at   DATETIME     NULL,
    updated_at   DATETIME     NULL,
    created_id   VARCHAR(20)  NULL,
    updated_id   VARCHAR(20)  NULL,
    PRIMARY KEY (company_cd, plan_yy, plan_mm, sales_emp_id, partner_cd),
    KEY idx_sales_plan_yy_dept (company_cd, plan_yy, dept_cd),
    KEY idx_sales_plan_yy_partner (company_cd, plan_yy, partner_cd)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='월매출계획';

CREATE TABLE sales_deal (
    deal_id           BIGINT       NOT NULL AUTO_INCREMENT,
    company_cd        INT          NOT NULL DEFAULT 1000,
    partner_cd        VARCHAR(20)  NULL     COMMENT 'ERP 거래처코드',
    partner_nm        VARCHAR(200) NULL     COMMENT '등록 시점 거래처명 스냅샷',
    sales_emp_id      VARCHAR(20)  NOT NULL COMMENT '영업담당자 (users.id)',
    title             VARCHAR(200) NOT NULL,
    stage             VARCHAR(20)  NOT NULL COMMENT 'LEAD/QUALIFIED/QUOTE/NEGOTIATION/WON/LOST',
    expected_amt      BIGINT       NOT NULL DEFAULT 0 COMMENT '예상 수주금액',
    probability       INT          NOT NULL DEFAULT 0 COMMENT '수주 확률(퍼센트)',
    expected_close_dt DATE         NULL     COMMENT '예상 마감(수주)일',
    closed_dt         DATE         NULL     COMMENT 'WON/LOST 로 바뀐 날',
    lost_reason       VARCHAR(500) NULL     COMMENT '실패 사유 (stage=LOST)',
    content           TINYTEXT     NULL,
    created_at        DATETIME     NULL,
    updated_at        DATETIME     NULL,
    created_id        VARCHAR(20)  NULL,
    updated_id        VARCHAR(20)  NULL,
    PRIMARY KEY (deal_id),
    KEY idx_deal_stage (company_cd, stage),
    KEY idx_deal_emp (company_cd, sales_emp_id),
    KEY idx_deal_partner (company_cd, partner_cd),
    KEY idx_deal_close (company_cd, expected_close_dt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='영업기회(딜)';

CREATE TABLE sales_activity (
    activity_id    BIGINT       NOT NULL AUTO_INCREMENT,
    company_cd     INT          NOT NULL DEFAULT 1000,
    activity_dt    DATE         NOT NULL COMMENT '영업활동 일자',
    sales_emp_id   VARCHAR(20)  NOT NULL COMMENT '영업담당자 (users.id)',
    partner_cd     VARCHAR(20)  NULL     COMMENT 'ERP 거래처코드. 내부업무 등 거래처가 없으면 NULL',
    partner_nm     VARCHAR(200) NULL     COMMENT '등록 시점 거래처명 스냅샷',
    activity_type  VARCHAR(20)  NOT NULL COMMENT 'VISIT/CALL/MAIL/QUOTE/CONTRACT/ETC',
    title          VARCHAR(200) NOT NULL,
    content        TINYTEXT     NULL,
    next_action_dt DATE         NULL     COMMENT '다음 액션 예정일',
    next_action    VARCHAR(500) NULL     COMMENT '다음에 할 일',
    amount         BIGINT       NULL     COMMENT '관련 예상/계약 금액',
    deal_id        BIGINT       NULL     COMMENT '연결된 영업기회 (sales_deal.deal_id)',
    created_at     DATETIME     NULL,
    updated_at     DATETIME     NULL,
    created_id     VARCHAR(20)  NULL,
    updated_id     VARCHAR(20)  NULL,
    PRIMARY KEY (activity_id),
    KEY idx_sact_dt (company_cd, activity_dt),
    KEY idx_sact_emp (company_cd, sales_emp_id, activity_dt),
    KEY idx_sact_partner (company_cd, partner_cd, activity_dt),
    KEY idx_sact_next (company_cd, next_action_dt),
    KEY idx_sact_deal (company_cd, deal_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='영업활동 이력';

CREATE TABLE partner_contact (
    contact_id  BIGINT       NOT NULL AUTO_INCREMENT,
    company_cd  INT          NOT NULL DEFAULT 1000,
    partner_cd  VARCHAR(20)  NOT NULL COMMENT 'ERP 거래처코드',
    name        VARCHAR(100) NOT NULL,
    position_nm VARCHAR(100) NULL     COMMENT '직위/직책',
    dept_nm     VARCHAR(100) NULL     COMMENT '고객사 부서',
    phone       VARCHAR(40)  NULL     COMMENT '휴대폰',
    tel         VARCHAR(40)  NULL     COMMENT '유선',
    email       VARCHAR(150) NULL,
    is_primary  TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '대표 담당자 여부',
    memo        VARCHAR(500) NULL,
    created_at  DATETIME     NULL,
    updated_at  DATETIME     NULL,
    created_id  VARCHAR(20)  NULL,
    updated_id  VARCHAR(20)  NULL,
    PRIMARY KEY (contact_id),
    KEY idx_pcontact_partner (company_cd, partner_cd, is_primary DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='고객 담당자 연락처 (거래처 카드)';

CREATE TABLE customer_contacts (
    id               BIGINT       NOT NULL AUTO_INCREMENT,
    company_cd       INT          NULL,
    partner_cd       VARCHAR(20)  NULL     COMMENT '거래처코드(ERP CI_PARTNER_MST)',
    company_name     VARCHAR(100) NULL     COMMENT '거래처명(캐시)',
    contact_name     VARCHAR(50)  NULL     COMMENT '거래처담당자',
    contact_dept     VARCHAR(100) NULL,
    contact_position VARCHAR(50)  NULL,
    contact_email    VARCHAR(100) NULL,
    contact_phone    VARCHAR(20)  NULL,
    note             VARCHAR(500) NULL,
    created_at       DATETIME     NULL,
    updated_at       DATETIME     NULL,
    created_id       VARCHAR(20)  NULL,
    updated_id       VARCHAR(20)  NULL,
    PRIMARY KEY (id),
    KEY idx_customer_contacts_partner (company_cd, partner_cd),
    KEY idx_customer_contacts_email (contact_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='고객 담당자 (옛 고객관리 — 화면 주석)';

CREATE TABLE goal_mst (
    company_cd   INT          NOT NULL,
    plant_cd     INT          NOT NULL,
    plan_yy      VARCHAR(4)   NOT NULL,
    plan_mm      VARCHAR(2)   NOT NULL,
    dept_cd      VARCHAR(10)  NOT NULL DEFAULT '',
    sales_emp_id VARCHAR(20)  NOT NULL DEFAULT '',
    field_cd     VARCHAR(10)  NOT NULL,
    goal_amt     BIGINT       NULL,
    inner_amt    BIGINT       NULL DEFAULT 0,
    outer_amt    BIGINT       NULL DEFAULT 0,
    actual_amt   BIGINT       NULL,
    note         VARCHAR(500) NULL,
    created_at   DATETIME     NULL,
    updated_at   DATETIME     NULL,
    created_id   VARCHAR(20)  NULL,
    updated_id   VARCHAR(20)  NULL,
    PRIMARY KEY (company_cd, plant_cd, plan_yy, plan_mm, dept_cd, sales_emp_id, field_cd),
    KEY idx_goal_mst_field (company_cd, plant_cd, plan_yy, field_cd)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='구 목표입력 (월매출계획으로 대체 — 화면 주석)';
