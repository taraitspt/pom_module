-- V6 (2026-10-19): 설비기술 대시보드 KPI 목표 — 3정5S 연 48건, 계획정비 비율 70% (원본 현황판의 성과관리 기준값).
INSERT INTO board_kpi_target (board_slug, metric_cd, scope_cd, target_year, target_val, note, created_at, created_id) VALUES
 ('equipment-tech', 'S3S',                'ALL', 2026, 48, '3정5S 연간 목표(건)',      NOW(), 'system'),
 ('equipment-tech', 'PLANNED_MAINT_RATE', 'ALL', 2026, 70, '계획정비 비율 목표(%)',    NOW(), 'system'),
 ('equipment-tech', 'URGENT_MAINT_RATE',  'ALL', 2026, 30, '긴급정비 비율 상한(%)',    NOW(), 'system');
