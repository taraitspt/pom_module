package com.tara.pom.boards.dto;

/**
 * 현황판이 ERP 에서 읽어 오는 원시 행 — ERP 화면 쿼리를 그대로 이식한 결과라 컬럼 뜻은 ERP 화면과 같다.
 * 집계·판정은 {@code BoardPerfService} 가 한다.
 */
public final class BoardErpRows {

    private BoardErpRows() {
    }

    /**
     * 생산실적현황(타라, MAPPIR00500) 을 월×설비로 묶은 한 줄.
     * 생산량은 정미수량(NET_QT), 제판(CTP)은 양품수량(MV_QT). 사내금액(WRK_AMT) = 계획 테이블의 작업금액.
     */
    public record MonthlyProduction(
            String ym,            // YYYYMM (MAX(PRWK_START_DT) 기준)
            String eqpCd,
            String eqpNm,
            String topOrgnCd,     // WC10 제판 / WC20 인쇄 / WC30 후가공 / WC40 제본
            String upOrgnCd,      // OP103 CTP / OP201 매엽 / OP202 국윤전 / OP203 46윤전 / OP301 코팅 / OP302 톰슨 / OP401 무선 / OP402 중철 …
            String upOrgnNm,
            long netQt,
            long mvQt,
            long wrkQt,
            long wrkAmt,
            int dxCount,
            int doCount
    ) {
    }

    /**
     * 생산지수보드(타라TPS, WKMWKS01400) 의 설비별 월 TPI — 작업일 TPI 의 평균(ERP 와 같이 소수 2자리 반올림 전 값을 들고 온다).
     * category: PM P00470 REL_FLAG_1_CD — 01 매엽 / 02 윤전 / 03 중철. 무선·제판·코팅은 ERP 에서도 TPI 가 없다.
     */
    public record MonthlyTpi(
            String ym,
            String eqpCd,
            String eqpNm,
            String category,
            int days,
            double tpi
    ) {
    }

    /** ME_QLTYNSTB_MST 부적합 한 건 (사내·외주 공통). */
    public record QualityIssue(
            String nstbNo,
            String acptDt,          // YYYYMMDD
            String acptTpCd,        // P07100
            String acptTpNm,
            String nstbDcCd,        // P07000
            String nstbDcNm,
            String topOrgnCd,
            String upOrgnCd,
            String upOrgnNm,
            String eqpCd,
            String eqpNm,
            String orddocNo,
            String orddocNm,
            String partnerCd,
            String partnerNm,
            String inoutcomFg,      // 01 사내 / 02 외주
            String osrcPartnerCd,
            String osrcPartnerNm,
            long procAmt,
            long expeAmt,
            String rsptDeptCd,
            String rsptDeptNm,
            String rspnberEmpNo,
            String rspnberNm,
            String nstbNm,
            String nstbDc,
            Double nstbQt,
            String billFg,
            String ocrnFg
    ) {
    }
}
