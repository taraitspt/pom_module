-- V3 (2026-10-19): 현황판 KPI 목표값 — 원본 현황판 HTML 에 박혀 있던 연목표를 DB 로.
-- 키 = 현황판 slug × 지표 × 범위 × 연도. 범위 ALL = 현황판 전체, 그 외 = 공정 코드(sheet/web/saddle …) 또는 설비코드.
CREATE TABLE board_kpi_target (
    target_id   BIGINT       NOT NULL AUTO_INCREMENT,
    board_slug  VARCHAR(40)  NOT NULL COMMENT 'production-ops / print-part / equipment-tech / outsourcing',
    metric_cd   VARCHAR(30)  NOT NULL COMMENT 'TPI / QUALITY_COUNT / QUALITY_COST / S3S / PLANNED_MAINT_RATE / MARGIN_RATE …',
    scope_cd    VARCHAR(40)  NOT NULL DEFAULT 'ALL' COMMENT 'ALL 또는 공정 코드·설비코드',
    target_year INT          NOT NULL,
    target_val  DOUBLE       NOT NULL,
    note        VARCHAR(200) NULL,
    created_at  DATETIME     NULL,
    updated_at  DATETIME     NULL,
    created_id  VARCHAR(20)  NULL,
    updated_id  VARCHAR(20)  NULL,
    PRIMARY KEY (target_id),
    UNIQUE KEY uk_board_kpi_target (board_slug, metric_cd, scope_cd, target_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='현황판 KPI 목표값';

-- 2026년 목표 — 원본 현황판(2026-10-19 시점) 값. 품질 건수·비용 목표 0 = 제로디펙트.
INSERT INTO board_kpi_target (board_slug, metric_cd, scope_cd, target_year, target_val, note, created_at, created_id) VALUES
 ('production-ops', 'TPI',                'ALL',   2026, 0.83,   '종합 TPI 연목표',            NOW(), 'system'),
 ('production-ops', 'QUALITY_COUNT',      'ALL',   2026, 0,      '품질 불량·클레임 0건',        NOW(), 'system'),
 ('production-ops', 'QUALITY_COST',       'ALL',   2026, 0,      '품질 불량비용 0원',           NOW(), 'system'),
 ('production-ops', 'S3S',                'ALL',   2026, 72,     '3정5S 개선 건수(연)',          NOW(), 'system'),
 ('production-ops', 'PLANNED_MAINT_RATE', 'ALL',   2026, 70,     '계획정비 비중(%)',             NOW(), 'system'),
 ('print-part',     'TPI',                'ALL',   2026, 0.8467, '인쇄파트(매엽+윤전) TPI',      NOW(), 'system'),
 ('print-part',     'TPI',                'sheet', 2026, 0.84,   '매엽 TPI',                    NOW(), 'system'),
 ('print-part',     'TPI',                'web',   2026, 0.8533, '윤전 TPI',                    NOW(), 'system'),
 ('print-part',     'QUALITY_COUNT',      'ALL',   2026, 0,      '품질 불량·클레임 0건',        NOW(), 'system'),
 ('print-part',     'QUALITY_COST',       'ALL',   2026, 0,      '품질 불량비용 0원',           NOW(), 'system');
