-- ============================================================
-- POM Module 시드 V2 (2026-10-19 스쿼시)
-- ------------------------------------------------------------
-- 빈 DB 에서 바로 로그인해 ERP 동기화를 돌릴 수 있는 최소값 + 권한 기본값.
-- 권한 값은 CRM 로컬 DB(crm_module, 2026-10-19 시점) 의 설정을 MenuCatalog 에 있는 메뉴만 옮긴 것이다.
-- 이후 변경은 관리자 > 권한 관리 화면에서 한다 — 마이그레이션으로 권한 행을 더 만들지 않는다.
-- ============================================================

-- 기본 부서 (ERP 동기화가 실제 조직으로 덮어쓴다)
INSERT INTO departments (company_cd, dept_cd, dept_nm, up_dept_cd, use_yn, created_at) VALUES
(1000, 1000, '대표이사',   NULL, 'Y', NOW()),
(1000, 1100, '영업1팀',    1000, 'Y', NOW()),
(1000, 1200, '영업2팀',    1000, 'Y', NOW()),
(1000, 1300, '경영지원팀', 1000, 'Y', NOW()),
(1000, 1400, '디자인팀',   1000, 'Y', NOW());

-- 관리자 계정 (admin / admin123 — BCrypt). 운영 반영 직후 비밀번호를 바꾼다.
INSERT INTO users (company_cd, id, employee_no, password, name, phone, email, dept_cd, role, status, created_at) VALUES
(1000, 'admin', 'EMP001', '$2a$10$ufHrkdLDkpp0b75CwjAE0.5kD7aJefwXSDDP2d.fooHKap9e15cNa', '관리자', '010-0000-0000', 'admin@tara.com', 1000, 'ADMIN', 'ACTIVE', NOW());

-- ---------- 메뉴 접근 (menu_permission) ----------
-- 역할 10개: ADMIN TEAM_LEADER MANAGER SALES_SPT PROD_SPT PART_LEADER EXECUTIVE CENTER_LEADER FINANCE STAFF

-- 생산현황 8개 + 공지사항: 전 역할 허용
INSERT INTO menu_permission (menu_key, role, can_view, created_at, created_id)
SELECT m.menu_key, r.role, 1, NOW(), 'system'
  FROM (SELECT '/production/plan' AS menu_key
        UNION ALL SELECT '/production/dashboard'
        UNION ALL SELECT '/production/equipment-perf'
        UNION ALL SELECT '/production/equipment-board'
        UNION ALL SELECT '/production/order-progress'
        UNION ALL SELECT '/production/plan-register'
        UNION ALL SELECT '/production/schedule'
        UNION ALL SELECT '/production/lifecycle'
        UNION ALL SELECT '/notices') m
 CROSS JOIN (SELECT 'ADMIN' AS role
             UNION ALL SELECT 'TEAM_LEADER'
             UNION ALL SELECT 'MANAGER'
             UNION ALL SELECT 'SALES_SPT'
             UNION ALL SELECT 'PROD_SPT'
             UNION ALL SELECT 'PART_LEADER'
             UNION ALL SELECT 'EXECUTIVE'
             UNION ALL SELECT 'CENTER_LEADER'
             UNION ALL SELECT 'FINANCE'
             UNION ALL SELECT 'STAFF') r;

-- 도구 > PDF 변환: 영업 쪽 역할만 (CRM 설정 그대로)
INSERT INTO menu_permission (menu_key, role, can_view, created_at, created_id) VALUES
 ('/tools/pdf', 'ADMIN',         1, NOW(), 'system'),
 ('/tools/pdf', 'TEAM_LEADER',   1, NOW(), 'system'),
 ('/tools/pdf', 'MANAGER',       1, NOW(), 'system'),
 ('/tools/pdf', 'SALES_SPT',     1, NOW(), 'system'),
 ('/tools/pdf', 'PART_LEADER',   1, NOW(), 'system'),
 ('/tools/pdf', 'EXECUTIVE',     1, NOW(), 'system'),
 ('/tools/pdf', 'PROD_SPT',      0, NOW(), 'system'),
 ('/tools/pdf', 'CENTER_LEADER', 0, NOW(), 'system'),
 ('/tools/pdf', 'FINANCE',       0, NOW(), 'system'),
 ('/tools/pdf', 'STAFF',         0, NOW(), 'system');

-- 관리자 메뉴: ADMIN 만 (없는 조합 = 허용 안 함)
INSERT INTO menu_permission (menu_key, role, can_view, created_at, created_id) VALUES
 ('/admin/active-users',     'ADMIN', 1, NOW(), 'system'),
 ('/admin/erp-sync',         'ADMIN', 1, NOW(), 'system'),
 ('/admin/users',            'ADMIN', 1, NOW(), 'system'),
 ('/admin/departments',      'ADMIN', 1, NOW(), 'system'),
 ('/admin/menu-permissions', 'ADMIN', 1, NOW(), 'system');

-- ---------- 데이터 범위 (resource_scope) ----------
-- 활동·기회·계획은 개인 소유물이라 역할에 따라 자르고, 매출현황(ERP 집계)은 전원 전체.
-- 생산지원(PROD_SPT)은 영업 데이터 전부 NONE.
INSERT INTO resource_scope (resource, role, scope, created_at, created_id)
SELECT r.resource, x.role,
       CASE
         WHEN x.role = 'PROD_SPT' THEN 'NONE'
         WHEN r.resource = 'SALES_STATS' THEN 'ALL'
         WHEN x.role IN ('ADMIN','SALES_SPT','EXECUTIVE','CENTER_LEADER','FINANCE') THEN 'ALL'
         WHEN x.role IN ('TEAM_LEADER','PART_LEADER') THEN 'DEPT'
         ELSE 'SELF'
       END,
       NOW(), 'system'
  FROM (SELECT 'ACTIVITY' AS resource
        UNION ALL SELECT 'DEAL'
        UNION ALL SELECT 'SALES_PLAN'
        UNION ALL SELECT 'SALES_STATS') r
 CROSS JOIN (SELECT 'ADMIN' AS role
             UNION ALL SELECT 'TEAM_LEADER'
             UNION ALL SELECT 'MANAGER'
             UNION ALL SELECT 'SALES_SPT'
             UNION ALL SELECT 'PROD_SPT'
             UNION ALL SELECT 'PART_LEADER'
             UNION ALL SELECT 'EXECUTIVE'
             UNION ALL SELECT 'CENTER_LEADER'
             UNION ALL SELECT 'FINANCE'
             UNION ALL SELECT 'STAFF') x;
