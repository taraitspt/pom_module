package com.tara.pom.boards.repository;

import com.tara.pom.boards.dto.BoardErpRows.MonthlyProduction;
import com.tara.pom.boards.dto.BoardErpRows.MonthlyTpi;
import com.tara.pom.boards.dto.BoardErpRows.QualityIssue;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;

/**
 * 현황판 ERP 조회 (읽기 전용). 세 쿼리 모두 ERP 화면 쿼리를 그대로 이식한 것이라 숫자가 ERP 화면과 같다
 * (2026-10-19 원본 현황판 HTML 과 원 단위 대조 — CLAUDE.md "현황판 ERP 출처").
 *
 * <ul>
 *   <li>{@link #monthlyProduction} — 생산실적현황(타라) MAPPIR00500: 정미수량·양품수량·사내금액을 월×설비로.</li>
 *   <li>{@link #monthlyTpi} — 생산지수보드(타라TPS) WKMWKS01400 getEqpTPI: 설비×작업일 TPI 를 월 평균으로.</li>
 *   <li>{@link #qualityIssues} — ME_QLTYNSTB_MST 부적합내역 + 코드·설비·주문·거래처·부서·담당자 이름.</li>
 * </ul>
 */
@Slf4j
@Repository
@RequiredArgsConstructor
@ConditionalOnProperty(name = "oracle.enabled", havingValue = "true")
public class OracleBoardPerfRepository {

    @Qualifier("oracleJdbcTemplate")
    private final JdbcTemplate jdbcTemplate;

    private static final String COMPANY = "1000";
    private static final String PLANT = "1000";

    // ------------------------------------------------------------------ 생산실적현황(타라)

    /**
     * MAPPIR00500 의 인라인 뷰를 그대로 두고 바깥에서 월×설비로 묶는다.
     * ERP 는 전 기간을 그룹한 뒤 MAX(PRWK_START_DT) 로 기간을 거르므로, 전년 11월부터 읽어야 1월 그룹의 합이 ERP 와 같다
     * (검증: 2025-12-01 부터 읽어 2026년 설비별 값이 원 단위로 일치).
     */
    private static final String PRODUCTION_SQL = """
            SELECT SUBSTR(T.PLAN_DT, 1, 6) AS YM, T.EQP_CD, T.EQP_NM, T.TOP_ORGN_CD, T.UP_ORGN_CD, T.UP_ORGN_NM,
                   SUM(T.NET_QT) AS NET_QT, SUM(T.MV_QT) AS MV_QT, SUM(T.WRK_QT) AS WRK_QT, SUM(T.WRK_AMT) AS WRK_AMT,
                   SUM(T.DX_COUNT) AS DX_COUNT, SUM(T.DO_COUNT) AS DO_COUNT
              FROM (
                    SELECT MWDX.EQP_CD, PES.EQP_NM, PWIX.TOP_ORGN_CD, PWIX.UP_ORGN_CD, MC2.SYSDEF_NM AS UP_ORGN_NM, MWDX.PAC_VR9,
                           MAX(MWDX.PRWK_START_DT) AS PLAN_DT,
                           CASE WHEN PWIX.TOP_ORGN_CD = 'WC10' THEN NVL(PPLX.WRK_AMT, 0)
                                WHEN PWIX.TOP_ORGN_CD = 'WC20' THEN NVL(PPIX.WRK_AMT, 0)
                                WHEN PWIX.TOP_ORGN_CD = 'WC30' THEN NVL(PPPX.WRK_AMT, 0)
                                WHEN PWIX.TOP_ORGN_CD = 'WC40' THEN NVL(PPBX.WRK_AMT, 0) ELSE 0 END AS WRK_AMT,
                           SUM(NVL(MWDX.WRK_QT, 0)) AS WRK_QT, SUM(NVL(MWDX.MV_QT, 0)) AS MV_QT, SUM(NVL(MWDX.NET_QT, 0)) AS NET_QT,
                           SUM(CASE WHEN MIM.ITEM_GRP_CD = '2001' THEN 1 ELSE 0 END) AS DO_COUNT,
                           SUM(CASE WHEN MIM.ITEM_GRP_CD = '2001' THEN 0 ELSE 1 END) AS DX_COUNT
                      FROM ME_WOCONF_DTL_X20329 MWDX
                      LEFT OUTER JOIN PM_EQ_SDTL PES ON PES.COMPANY_CD = MWDX.COMPANY_CD AND PES.EQP_CD = MWDX.EQP_CD AND PES.LANG_CD = 'KO'
                      LEFT OUTER JOIN PP_WCOP_MST WOP ON WOP.COMPANY_CD = MWDX.COMPANY_CD AND WOP.PLANT_CD = MWDX.PLANT_CD AND WOP.OP_CD = MWDX.OP_CD
                      LEFT OUTER JOIN MA_WRK_INFO MWI ON MWI.COMPANY_CD = MWDX.COMPANY_CD AND MWI.PLANT_CD = MWDX.PLANT_CD AND MWI.WC_CD = WOP.WC_CD
                      LEFT OUTER JOIN PP_WRKGRP_INFO_X20329 PWIX ON PWIX.COMPANY_CD = MWDX.COMPANY_CD AND PWIX.PLANT_CD = MWDX.PLANT_CD AND PWIX.WC_CD = MWI.WC_CD AND PWIX.OP_CD = MWDX.OP_CD
                      LEFT OUTER JOIN MA_CODEDTL MC2 ON MC2.COMPANY_CD = MWDX.COMPANY_CD AND MC2.MODULE_CD = 'PP' AND MC2.FIELD_CD = 'Z005_20329' AND MC2.SYSDEF_CD = PWIX.UP_ORGN_CD
                      LEFT OUTER JOIN PP_PLANPRW_INFO_X20329 PPIX ON PPIX.COMPANY_CD = MWDX.COMPANY_CD AND PPIX.PLANT_CD = MWDX.PLANT_CD AND PPIX.PLAN_NO = MWDX.PLAN_NO AND PPIX.PLAN_SQ = MWDX.PLAN_SQ AND PPIX.PLAN_HIS_SQ = MWDX.PLAN_HIS_SQ AND PPIX.PLAN_LOW_SQ = MWDX.PLAN_LOW_SQ
                      LEFT OUTER JOIN PP_PLANPLMK_INFO_X20329 PPLX ON PPLX.COMPANY_CD = MWDX.COMPANY_CD AND PPLX.PLANT_CD = MWDX.PLANT_CD AND PPLX.PLAN_NO = MWDX.PLAN_NO AND PPLX.PLAN_SQ = MWDX.PLAN_SQ AND PPLX.PLAN_HIS_SQ = MWDX.PLAN_HIS_SQ AND PPLX.PLAN_LOW_SQ = MWDX.PLAN_LOW_SQ
                      LEFT OUTER JOIN PP_PLANPROCS_INFO_X20329 PPPX ON PPPX.COMPANY_CD = MWDX.COMPANY_CD AND PPPX.PLANT_CD = MWDX.PLANT_CD AND PPPX.PLAN_NO = MWDX.PLAN_NO AND PPPX.PLAN_SQ = MWDX.PLAN_SQ AND PPPX.PLAN_HIS_SQ = MWDX.PLAN_HIS_SQ AND PPPX.PLAN_LOW_SQ = MWDX.PLAN_LOW_SQ
                      LEFT OUTER JOIN PP_PLANBBND_INFO_X20329 PPBX ON PPBX.COMPANY_CD = MWDX.COMPANY_CD AND PPBX.PLANT_CD = MWDX.PLANT_CD AND PPBX.PLAN_NO = MWDX.PLAN_NO AND PPBX.PLAN_SQ = MWDX.PLAN_SQ AND PPBX.PLAN_HIS_SQ = MWDX.PLAN_HIS_SQ AND PPBX.PLAN_LOW_SQ = MWDX.PLAN_LOW_SQ
                      LEFT OUTER JOIN PP_PLAN_DTL_X20329 PPDX ON PPDX.COMPANY_CD = MWDX.COMPANY_CD AND PPDX.PLANT_CD = MWDX.PLANT_CD AND PPDX.PLAN_NO = MWDX.PLAN_NO AND PPDX.PLAN_SQ = MWDX.PLAN_SQ
                      LEFT OUTER JOIN MA_ITEM MIM ON MIM.COMPANY_CD = PPDX.COMPANY_CD AND MIM.ITEM_CD = PPDX.ITEM_CD
                     WHERE MWDX.COMPANY_CD = ? AND MWDX.PLANT_CD = ?
                       AND MWDX.PAC_VR9 IS NOT NULL
                       AND MWDX.PRWK_START_DT BETWEEN ? AND ?
                     GROUP BY MWDX.COMPANY_CD, MWDX.PLANT_CD, PPDX.ITEM_CD, MIM.ITEM_GRP_CD, PWIX.TOP_ORGN_CD, PWIX.UP_ORGN_CD, MC2.SYSDEF_NM,
                              MWDX.EQP_CD, PES.EQP_NM, MWDX.PAC_VR9,
                              CASE WHEN PWIX.TOP_ORGN_CD = 'WC10' THEN NVL(PPLX.WRK_AMT, 0)
                                   WHEN PWIX.TOP_ORGN_CD = 'WC20' THEN NVL(PPIX.WRK_AMT, 0)
                                   WHEN PWIX.TOP_ORGN_CD = 'WC30' THEN NVL(PPPX.WRK_AMT, 0)
                                   WHEN PWIX.TOP_ORGN_CD = 'WC40' THEN NVL(PPBX.WRK_AMT, 0) ELSE 0 END
                   ) T
             WHERE T.PLAN_DT BETWEEN ? AND ?
             GROUP BY SUBSTR(T.PLAN_DT, 1, 6), T.EQP_CD, T.EQP_NM, T.TOP_ORGN_CD, T.UP_ORGN_CD, T.UP_ORGN_NM
             ORDER BY 1, 4, 5, 2
            """;

    /** 한 해의 월×설비 생산실적. 전년 11월 1일부터 읽어 그룹 합을 ERP 와 맞춘다. */
    public List<MonthlyProduction> monthlyProduction(int year) {
        String from = year + "0101";
        String to = year + "1231";
        String readFrom = (year - 1) + "1101";
        long t0 = System.currentTimeMillis();
        List<MonthlyProduction> rows = jdbcTemplate.query(PRODUCTION_SQL, (rs, i) -> new MonthlyProduction(
                rs.getString("YM"), rs.getString("EQP_CD"), nz(rs.getString("EQP_NM")),
                nz(rs.getString("TOP_ORGN_CD")), nz(rs.getString("UP_ORGN_CD")), nz(rs.getString("UP_ORGN_NM")),
                rs.getLong("NET_QT"), rs.getLong("MV_QT"), rs.getLong("WRK_QT"), rs.getLong("WRK_AMT"),
                rs.getInt("DX_COUNT"), rs.getInt("DO_COUNT")),
                COMPANY, PLANT, readFrom, to, from, to);
        log.debug("[boards] production {} rows={} {}ms", year, rows.size(), System.currentTimeMillis() - t0);
        return rows;
    }

    // ------------------------------------------------------------------ 생산지수보드(타라TPS)

    /**
     * WKMWKS01400 getEqpTPI 의 설비×작업일 TPI 를 월 평균으로. ERP 와 같은 식:
     * 정미수량/(부하시간×목표속도) + 대교JOB수×목표작업변경시간/부하시간 + 상업물JOB수×목표작업시간/부하시간,
     * 부하시간 = 설비 일별 부하시간(ME_EQPDNBWRK_INFO_X20329) 합 − 계획비가동(ME_EIOSTATE_HST 사유 020).
     * 계획비가동 재귀 전개는 전년 12월부터만 읽는다(전 기간을 전개하면 수십 초).
     */
    private static final String TPI_SQL = """
            WITH RECURSIVE_DATES (COMPANY_CD, PLANT_CD, EQP_CD, WORK_DATE, START_DTS, END_DTS) AS (
                SELECT COMPANY_CD, PLANT_CD, EQP_CD, TRUNC(START_DTS), START_DTS, END_DTS
                  FROM ME_EIOSTATE_HST
                 WHERE COMPANY_CD = ? AND PLANT_CD = ? AND NONOP_REASON_CD = '020' AND START_DTS >= TO_DATE(?, 'YYYYMMDD')
                UNION ALL
                SELECT COMPANY_CD, PLANT_CD, EQP_CD, WORK_DATE + 1, START_DTS, END_DTS
                  FROM RECURSIVE_DATES WHERE TRUNC(END_DTS) >= WORK_DATE + 1
            ), DAYROWS AS (
                SELECT DISTINCT MEI.COMPANY_CD, MEI.PLANT_CD, MEB.WRK_DT, MEI.EQP_CD, PES.EQP_NM, MWD.NET_QT,
                       SUM(MEB.BWRK_TM) OVER (PARTITION BY MEI.COMPANY_CD, MEI.PLANT_CD, MEI.EQP_CD, MEB.WRK_DT) - NVL(MEH.NOP_TIME, 0) AS TOTAL_BWRK_TM,
                       MWD.A_CNT, MWD.B_CNT, NVL(MCAP.TIMEBY_PR_QT, 0) AS TIMEBY_PR_QT, NVL(MCAP.PAC_QT, 0) AS PAC_QT, NVL(MCAP.PAC_QT1, 0) AS PAC_QT1
                  FROM ME_EQPCAPA_INFO MEI
                 INNER JOIN PM_EQ_SDTL PES ON MEI.COMPANY_CD = PES.COMPANY_CD AND MEI.EQP_CD = PES.EQP_CD AND PES.LANG_CD = 'KO'
                 INNER JOIN ME_EQPDNBWRK_INFO_X20329 MEB ON MEI.COMPANY_CD = MEB.COMPANY_CD AND MEI.PLANT_CD = MEB.PLANT_CD AND MEI.EQP_CD = MEB.EQP_CD
                 INNER JOIN ME_EQPCAPA_INFO_X20329 MCAP ON MEI.COMPANY_CD = MCAP.COMPANY_CD AND MEI.PLANT_CD = MCAP.PLANT_CD AND MEI.EQP_CD = MCAP.EQP_CD
                  LEFT JOIN (SELECT COMPANY_CD, PLANT_CD, EQP_CD, TO_CHAR(WORK_DATE, 'YYYYMMDD') AS WRK_DT,
                                    SUM(ROUND(((LEAST(END_DTS, WORK_DATE + INTERVAL '1' DAY) - GREATEST(START_DTS, WORK_DATE)) * 1440) / 60, 1)) AS NOP_TIME
                               FROM RECURSIVE_DATES
                              GROUP BY COMPANY_CD, PLANT_CD, EQP_CD, TO_CHAR(WORK_DATE, 'YYYYMMDD')) MEH
                         ON MEB.COMPANY_CD = MEH.COMPANY_CD AND MEB.PLANT_CD = MEH.PLANT_CD AND MEB.EQP_CD = MEH.EQP_CD AND MEB.WRK_DT = MEH.WRK_DT
                  LEFT JOIN (SELECT MWD.COMPANY_CD, MWD.PLANT_CD, MWD.WRK_DT, MWD.EQP_CD, NVL(SUM(NET_QT), 0) AS NET_QT,
                                    COUNT(DISTINCT CASE WHEN SOM.WRK_FG IN ('100', '101', '102', '103') OR MWD.ORDDOC_NO LIKE 'PQE%'
                                                        THEN PLAN_NO || '-' || PLAN_HIS_SQ || '-' || PLAN_SQ || '-' || PLAN_LOW_SQ || '-' || NVL(PAC_VR1, '') END) AS A_CNT,
                                    COUNT(DISTINCT CASE WHEN SOM.WRK_FG NOT IN ('100', '101', '102', '103')
                                                        THEN PLAN_NO || '-' || PLAN_HIS_SQ || '-' || PLAN_SQ || '-' || PLAN_LOW_SQ || '-' || NVL(PAC_VR1, '') END) AS B_CNT
                               FROM ME_WOCONF_DTL_X20329 MWD
                              INNER JOIN ME_EQPCAPA_INFO MEI ON MWD.COMPANY_CD = MEI.COMPANY_CD AND MWD.PLANT_CD = MEI.PLANT_CD AND MWD.EQP_CD = MEI.EQP_CD
                               LEFT JOIN SD_ORDER_MST_X20329 SOM ON MWD.COMPANY_CD = SOM.COMPANY_CD AND MWD.PLANT_CD = SOM.PLAN_PLANT_CD AND MWD.ORDDOC_NO = SOM.ORDDOC_NO
                              WHERE MWD.COMPANY_CD = ? AND MWD.PLANT_CD = ?
                                AND MEI.INOUTCOM_FG = '01' AND MEI.EQP_INTL_YN = 'Y' AND MEI.SL_CD IS NOT NULL
                                AND MWD.WRK_ST = '03' AND MWD.WRK_DT BETWEEN ? AND ?
                              GROUP BY MWD.COMPANY_CD, MWD.PLANT_CD, MWD.WRK_DT, MWD.EQP_CD) MWD
                         ON MEB.COMPANY_CD = MWD.COMPANY_CD AND MEB.PLANT_CD = MWD.PLANT_CD AND MEB.EQP_CD = MWD.EQP_CD AND MEB.WRK_DT = MWD.WRK_DT
                 WHERE MEI.COMPANY_CD = ? AND MEI.PLANT_CD = ?
                   AND MEI.INOUTCOM_FG = '01' AND MEI.EQP_INTL_YN = 'Y' AND MEI.SL_CD IS NOT NULL
                   AND MWD.NET_QT > 0
            ), DAYTPI AS (
                SELECT A.EQP_CD, A.EQP_NM, SUBSTR(A.WRK_DT, 1, 6) AS YM, C.REL_FLAG_1_CD AS CAT,
                       NVL(ROUND(CASE WHEN (A.TOTAL_BWRK_TM * A.TIMEBY_PR_QT) = 0 THEN 0 ELSE A.NET_QT / (A.TOTAL_BWRK_TM * A.TIMEBY_PR_QT) END, 2), 0)
                     + NVL(ROUND(CASE WHEN A.TOTAL_BWRK_TM = 0 THEN 0 ELSE (A.A_CNT * A.PAC_QT1) / A.TOTAL_BWRK_TM END, 2), 0)
                     + NVL(ROUND(CASE WHEN A.TOTAL_BWRK_TM = 0 THEN 0 ELSE (A.B_CNT * A.PAC_QT) / A.TOTAL_BWRK_TM END, 2), 0) AS TPI
                  FROM DAYROWS A
                 INNER JOIN PM_EQ_DTL B ON A.COMPANY_CD = B.COMPANY_CD AND A.EQP_CD = B.EQP_CD
                 INNER JOIN MA_CODEDTL C ON B.COMPANY_CD = C.COMPANY_CD AND B.EQP_TP_CD = C.SYSDEF_CD AND C.MODULE_CD = 'PM' AND C.FIELD_CD = 'P00470'
                 WHERE A.WRK_DT BETWEEN ? AND ? AND C.REL_FLAG_1_CD IN ('01', '02', '03')
            )
            SELECT EQP_CD, EQP_NM, CAT, YM, COUNT(*) AS DAYS, AVG(TPI) AS TPI
              FROM DAYTPI
             GROUP BY EQP_CD, EQP_NM, CAT, YM
             ORDER BY CAT, EQP_CD, YM
            """;

    /** 한 해의 설비별 월 TPI (매엽·윤전·중철). 반올림은 서비스가 ERP 와 같은 자리에서 한다. */
    public List<MonthlyTpi> monthlyTpi(int year) {
        String from = year + "0101";
        String to = year + "1231";
        String nopFrom = (year - 1) + "1201";
        long t0 = System.currentTimeMillis();
        List<MonthlyTpi> rows = jdbcTemplate.query(TPI_SQL, (rs, i) -> new MonthlyTpi(
                rs.getString("YM"), rs.getString("EQP_CD"), nz(rs.getString("EQP_NM")), nz(rs.getString("CAT")),
                rs.getInt("DAYS"), rs.getDouble("TPI")),
                COMPANY, PLANT, nopFrom, COMPANY, PLANT, from, to, COMPANY, PLANT, from, to);
        log.debug("[boards] tpi {} rows={} {}ms", year, rows.size(), System.currentTimeMillis() - t0);
        return rows;
    }

    // ------------------------------------------------------------------ 부적합내역

    private static final String QUALITY_SQL = """
            SELECT Q.NSTB_NO, Q.ACPT_DT, Q.ACPT_TP_CD, AT.SYSDEF_NM AS ACPT_TP_NM, Q.NSTB_DC_CD, DC.SYSDEF_NM AS NSTB_DC_NM,
                   PW.TOP_ORGN_CD, PW.UP_ORGN_CD, UO.SYSDEF_NM AS UP_ORGN_NM,
                   Q.EQP_CD, PES.EQP_NM, Q.ORDDOC_NO, SOM.ORDDOC_NM, Q.PARTNER_CD, CP.PARTNER_NM,
                   Q.INOUTCOM_FG, Q.OSRC_PARTNER_CD, OP.PARTNER_NM AS OSRC_PARTNER_NM, NVL(Q.PROC_AMT, 0) AS PROC_AMT, NVL(Q.EXPE_AMT, 0) AS EXPE_AMT,
                   Q.RSPT_DEPT_CD, MD.DEPT_NM, Q.RSPNBER_EMP_NO, HEM.KOR_NM AS RSPNBER_NM, Q.NSTB_NM, Q.NSTB_DC, Q.NSTB_QT, Q.BILL_FG, Q.OCRN_FG
              FROM ME_QLTYNSTB_MST Q
              LEFT JOIN MA_CODEDTL AT ON AT.COMPANY_CD = Q.COMPANY_CD AND AT.MODULE_CD = 'ME' AND AT.FIELD_CD = 'P07100' AND AT.SYSDEF_CD = Q.ACPT_TP_CD
              LEFT JOIN MA_CODEDTL DC ON DC.COMPANY_CD = Q.COMPANY_CD AND DC.MODULE_CD = 'ME' AND DC.FIELD_CD = 'P07000' AND DC.SYSDEF_CD = Q.NSTB_DC_CD
              LEFT JOIN PP_WRKGRP_INFO_X20329 PW ON PW.COMPANY_CD = Q.COMPANY_CD AND PW.PLANT_CD = Q.PLANT_CD AND PW.WC_CD = Q.WC_CD AND PW.OP_CD = Q.OP_CD
              LEFT JOIN MA_CODEDTL UO ON UO.COMPANY_CD = Q.COMPANY_CD AND UO.MODULE_CD = 'PP' AND UO.FIELD_CD = 'Z005_20329' AND UO.SYSDEF_CD = PW.UP_ORGN_CD
              LEFT JOIN PM_EQ_SDTL PES ON PES.COMPANY_CD = Q.COMPANY_CD AND PES.EQP_CD = Q.EQP_CD AND PES.LANG_CD = 'KO'
              LEFT JOIN SD_ORDER_MST_X20329 SOM ON SOM.COMPANY_CD = Q.COMPANY_CD AND SOM.ORDDOC_NO = Q.ORDDOC_NO
              LEFT JOIN CI_PARTNER_MST CP ON CP.PARTNER_CD = Q.PARTNER_CD
              LEFT JOIN CI_PARTNER_MST OP ON OP.PARTNER_CD = Q.OSRC_PARTNER_CD
              LEFT JOIN MA_DEPT_MST MD ON MD.COMPANY_CD = Q.COMPANY_CD AND MD.DEPT_CD = Q.RSPT_DEPT_CD
              LEFT JOIN HR_EMP_MST HEM ON HEM.COMPANY_CD = Q.COMPANY_CD AND HEM.EMP_NO = Q.RSPNBER_EMP_NO
             WHERE Q.COMPANY_CD = ? AND Q.ACPT_DT BETWEEN ? AND ?
             ORDER BY Q.ACPT_DT DESC, Q.NSTB_NO DESC
            """;

    /** 접수일 구간의 부적합 전부(사내·외주). 범위 판정(책임부서·담당자·사내외주)은 서비스가 한다. */
    public List<QualityIssue> qualityIssues(String fromYmd, String toYmd) {
        long t0 = System.currentTimeMillis();
        List<QualityIssue> rows = jdbcTemplate.query(QUALITY_SQL, (rs, i) -> mapQuality(rs), COMPANY, fromYmd, toYmd);
        log.debug("[boards] quality {}~{} rows={} {}ms", fromYmd, toYmd, rows.size(), System.currentTimeMillis() - t0);
        return rows;
    }

    private static QualityIssue mapQuality(ResultSet rs) throws SQLException {
        Double qt = rs.getObject("NSTB_QT") == null ? null : rs.getDouble("NSTB_QT");
        return new QualityIssue(
                rs.getString("NSTB_NO"), rs.getString("ACPT_DT"),
                nz(rs.getString("ACPT_TP_CD")), nz(rs.getString("ACPT_TP_NM")),
                nz(rs.getString("NSTB_DC_CD")), nz(rs.getString("NSTB_DC_NM")),
                nz(rs.getString("TOP_ORGN_CD")), nz(rs.getString("UP_ORGN_CD")), nz(rs.getString("UP_ORGN_NM")),
                nz(rs.getString("EQP_CD")), nz(rs.getString("EQP_NM")),
                nz(rs.getString("ORDDOC_NO")), nz(rs.getString("ORDDOC_NM")),
                nz(rs.getString("PARTNER_CD")), nz(rs.getString("PARTNER_NM")),
                nz(rs.getString("INOUTCOM_FG")), nz(rs.getString("OSRC_PARTNER_CD")), nz(rs.getString("OSRC_PARTNER_NM")),
                rs.getLong("PROC_AMT"), rs.getLong("EXPE_AMT"),
                nz(rs.getString("RSPT_DEPT_CD")), nz(rs.getString("DEPT_NM")),
                nz(rs.getString("RSPNBER_EMP_NO")), nz(rs.getString("RSPNBER_NM")),
                nz(rs.getString("NSTB_NM")), clob(rs, "NSTB_DC"), qt,
                nz(rs.getString("BILL_FG")), nz(rs.getString("OCRN_FG")));
    }

    /** 책임부서 트리(ERP MA_DEPT_MST UP_DEPT_CD) — 생산운영팀(3240) 하위 전부. */
    public List<String> deptTree(String rootDeptCd) {
        return jdbcTemplate.query("""
                SELECT DEPT_CD FROM MA_DEPT_MST WHERE COMPANY_CD = ?
                 START WITH DEPT_CD = ? CONNECT BY PRIOR DEPT_CD = UP_DEPT_CD
                """, (rs, i) -> rs.getString(1), COMPANY, rootDeptCd);
    }

    private static String nz(String s) {
        return s == null ? "" : s.trim();
    }

    private static String clob(ResultSet rs, String col) throws SQLException {
        try {
            java.sql.Clob c = rs.getClob(col);
            if (c == null) return "";
            long len = c.length();
            return len == 0 ? "" : c.getSubString(1, (int) Math.min(len, 4000)).trim();
        } catch (SQLException e) {
            return nz(rs.getString(col));
        }
    }
}
