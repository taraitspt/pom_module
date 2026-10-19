package com.tara.pom.boards.repository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 외주협력팀 현황판 ERP 조회 (읽기 전용) — 외주 발주 {@code PP_PURORDER_MST/DTL_X20329}.
 * 발주 한 건 = 헤더(발주일·업체·담당·주문·계획) + 라인 합계(금액·라인 수·작업장 그룹).
 * 2026-10-01~16 검증: 발주 금액 506,816,652 — 원본 현황판 506,803,102 와 소수점 차이뿐.
 */
@Slf4j
@Repository
@RequiredArgsConstructor
@ConditionalOnProperty(name = "oracle.enabled", havingValue = "true")
public class OracleOutsourcingRepository {

    @Qualifier("oracleJdbcTemplate")
    private final JdbcTemplate jdbcTemplate;

    public record PurchaseOrder(
            String poDate,        // YYYY-MM-DD
            String poNo,
            String partnerCd,
            String partnerNm,
            String empNo,
            String empNm,
            String orderNo,
            String orderNm,
            String planNo,
            String purGrpCd,
            long amount,
            int lines,
            String processes,     // "WC20:OP201,WC40:OP401" (작업장그룹:공정)
            String confirmed      // 라인 중 확정 여부 MAX
    ) {
    }

    private static final String PO_SQL = """
            SELECT M.PUR_PO_DT, M.PURDOC_NO, M.PARTNER_CD, P.PARTNER_NM, M.EMP_NO, H.KOR_NM, M.ORDDOC_NO, S.ORDDOC_NM, M.PLAN_NO, M.PURGRP_CD,
                   NVL(D.AMT, 0) AS AMT, NVL(D.LINES, 0) AS LINES, D.TOP_ORGNS, D.CNFM
              FROM PP_PURORDER_MST_X20329 M
              LEFT JOIN CI_PARTNER_MST P ON P.PARTNER_CD = M.PARTNER_CD
              LEFT JOIN HR_EMP_MST H ON H.COMPANY_CD = M.COMPANY_CD AND H.EMP_NO = M.EMP_NO
              LEFT JOIN SD_ORDER_MST_X20329 S ON S.COMPANY_CD = M.COMPANY_CD AND S.ORDDOC_NO = M.ORDDOC_NO
              LEFT JOIN (SELECT COMPANY_CD, PLANT_CD, PURDOC_NO, SUM(PO_AMT) AS AMT, COUNT(*) AS LINES,
                                LISTAGG(DISTINCT TOP_ORGN_CD || ':' || UP_ORGN_CD, ',') WITHIN GROUP (ORDER BY TOP_ORGN_CD) AS TOP_ORGNS,
                                MAX(CNFM_YN) AS CNFM
                           FROM PP_PURORDER_DTL_X20329
                          WHERE COMPANY_CD = ? AND PLANT_CD = ?
                          GROUP BY COMPANY_CD, PLANT_CD, PURDOC_NO) D
                     ON D.COMPANY_CD = M.COMPANY_CD AND D.PLANT_CD = M.PLANT_CD AND D.PURDOC_NO = M.PURDOC_NO
             WHERE M.COMPANY_CD = ? AND M.PLANT_CD = ? AND M.PUR_PO_DT BETWEEN ? AND ?
             ORDER BY M.PUR_PO_DT DESC, M.PURDOC_NO DESC
            """;

    /** 발주일 구간(YYYYMMDD)의 외주 발주 전부. */
    public List<PurchaseOrder> purchaseOrders(String fromYmd, String toYmd) {
        long t0 = System.currentTimeMillis();
        List<PurchaseOrder> rows = jdbcTemplate.query(PO_SQL, (rs, i) -> new PurchaseOrder(
                ymd(rs.getString("PUR_PO_DT")), rs.getString("PURDOC_NO"), nz(rs.getString("PARTNER_CD")), nz(rs.getString("PARTNER_NM")),
                nz(rs.getString("EMP_NO")), nz(rs.getString("KOR_NM")), nz(rs.getString("ORDDOC_NO")), nz(rs.getString("ORDDOC_NM")),
                nz(rs.getString("PLAN_NO")), nz(rs.getString("PURGRP_CD")),
                Math.round(rs.getDouble("AMT")), rs.getInt("LINES"), nz(rs.getString("TOP_ORGNS")), nz(rs.getString("CNFM"))),
                "1000", "1000", "1000", "1000", fromYmd, toYmd);
        log.debug("[boards] outsourcing PO {}~{} rows={} {}ms", fromYmd, toYmd, rows.size(), System.currentTimeMillis() - t0);
        return rows;
    }

    private static String nz(String s) {
        return s == null ? "" : s.trim();
    }

    private static String ymd(String d) {
        return d != null && d.length() == 8 ? d.substring(0, 4) + "-" + d.substring(4, 6) + "-" + d.substring(6, 8) : nz(d);
    }
}
