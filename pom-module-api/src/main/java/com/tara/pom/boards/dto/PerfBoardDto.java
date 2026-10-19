package com.tara.pom.boards.dto;

import java.util.List;
import java.util.Map;

/**
 * 현황판 "실적·품질" 응답 — 한 해(1~12월) 분량. 월 배열은 index 0 = 1월, 실적이 없는 달은 null.
 * 화면(종합·실적·품질 탭)은 이걸로 KPI·차트·설비 표·품질 목록을 전부 그린다.
 */
public record PerfBoardDto(
        String slug,
        int year,
        /** 실적이 있는 마지막 달(1~12, 없으면 0) — 화면의 "집계 완료" 프리셋·누계 범위. */
        int lastMonth,
        List<ProcessPerf> processes,
        List<QualityIssueDto> qualityIssues,
        List<TargetDto> targets,
        String generatedAt
) {

    /** 공정 한 줄 — 월 시계열과 설비별 누계. */
    public record ProcessPerf(
            String code,
            String name,
            String unit,
            boolean hasTpi,
            Double[] tpi,            // 설비 월 TPI(ROUND 2) 의 평균, ERP 생산지수보드와 같은 자리에서 반올림
            Integer[] quality,       // 품질 건수
            Long[] cost,             // 품질비용(원)
            Long[] production,       // 생산량(단위 = unit)
            Long[] revenue,          // 생산매출(원, 사내금액)
            List<EquipmentPerf> equipments,
            /** 코팅처럼 공정 안을 나눠 보여줄 때 — 코드별 월 생산량/매출. 없으면 빈 맵. */
            Map<String, SplitPerf> splits
    ) {
    }

    public record SplitPerf(String name, String unit, Long[] production, Long[] revenue) {
    }

    /** 설비 한 대 — 연 누계 + 월 시계열. */
    public record EquipmentPerf(
            String eqpCd,
            String name,
            String splitCode,        // 코팅/톰슨 같은 하위 구분, 없으면 null
            long production,
            long revenue,
            Double tpi,              // 월 TPI 의 평균 (0 제외), 없으면 null
            int quality,
            long qcost,
            Double[] tpiMonthly,
            Long[] productionMonthly,
            Long[] revenueMonthly
    ) {
    }

    /** 품질(부적합) 한 건 — 화면 표·집계용. */
    public record QualityIssueDto(
            String nstbNo,
            String date,             // YYYY-MM-DD
            String month,            // YYYY-MM
            String processCode,      // BoardScope.processCodeOf
            String processName,
            String acptTpCd,
            String acptTpNm,
            String nstbDcCd,
            String nstbDcNm,
            String eqpCd,
            String eqpNm,
            String orderNo,
            String orderNm,
            String partnerNm,
            String inoutcomFg,
            String osrcPartnerNm,
            long procAmt,
            String deptNm,
            String personNm,
            String title,            // NSTB_NM
            String content           // NSTB_DC
    ) {
    }

    /** KPI 목표 — board_kpi_target 한 행. */
    public record TargetDto(String metric, String scope, double value, String note) {
    }
}
