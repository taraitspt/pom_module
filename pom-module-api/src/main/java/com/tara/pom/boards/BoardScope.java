package com.tara.pom.boards;

import java.util.List;
import java.util.Set;

/**
 * 현황판 범위 정의 — 어느 공정·설비를 묶어 보여주는지. 원본 현황판(생산운영팀·인쇄파트)의 공정 탭과 같다.
 *
 * <p>공정 코드는 ERP 공정(PP Z005_20329 UP_ORGN_CD) 을 묶은 것이고, 자사 설비는 설비코드 접두 {@code T01}
 * (공장 1000 자사 설비 — 외주 설비 T11/T14/T15/T16 제외; 원본 현황판도 자사 설비만 넣었다).
 * 생산량 기준: 제판(CTP)은 양품수량, 나머지는 정미수량 — ERP 생산실적현황과 같다.
 */
public final class BoardScope {

    private BoardScope() {
    }

    /** 설비 수량에서 쓸 컬럼. */
    public enum QtyField { NET, MV }

    /**
     * 공정 하나.
     *
     * @param code        화면·API 코드 (plate/sheet/web/saddle/perfect/coating)
     * @param name        표시명
     * @param unit        수량 단위
     * @param upOrgnCds   포함할 ERP 공정 코드
     * @param qtyField    생산량 컬럼
     * @param tpiCategory PM P00470 REL_FLAG_1_CD (01 매엽 / 02 윤전 / 03 중철) — 없으면 TPI 없음
     * @param splitBy     공정 안을 ERP 공정별로 나눠 보여줄 때(코팅 = 코팅/톰슨) 그 코드별 이름
     */
    public record ProcessDef(String code, String name, String unit, Set<String> upOrgnCds, QtyField qtyField,
                             String tpiCategory, List<Split> splitBy) {
    }

    public record Split(String code, String name, String unit, Set<String> upOrgnCds) {
    }

    public static final ProcessDef PLATE = new ProcessDef("plate", "제판", "판", Set.of("OP103"), QtyField.MV, null, List.of());
    public static final ProcessDef SHEET = new ProcessDef("sheet", "매엽", "통", Set.of("OP201"), QtyField.NET, "01", List.of());
    public static final ProcessDef WEB = new ProcessDef("web", "윤전", "통", Set.of("OP202", "OP203"), QtyField.NET, "02", List.of());
    public static final ProcessDef SADDLE = new ProcessDef("saddle", "중철", "부", Set.of("OP402"), QtyField.NET, "03", List.of());
    public static final ProcessDef PERFECT = new ProcessDef("perfect", "무선", "부", Set.of("OP401"), QtyField.NET, null, List.of());
    public static final ProcessDef COATING = new ProcessDef("coating", "코팅·톰슨", "매", Set.of("OP301", "OP302"), QtyField.NET, null,
            List.of(new Split("coating", "코팅", "매", Set.of("OP301")), new Split("thomson", "톰슨", "R", Set.of("OP302"))));

    /** 생산운영팀 현황판 — 전 공정. */
    public static final List<ProcessDef> PRODUCTION_OPS = List.of(PLATE, SHEET, WEB, SADDLE, PERFECT, COATING);
    /** 인쇄파트 현황판 — 매엽·윤전. */
    public static final List<ProcessDef> PRINT_PART = List.of(SHEET, WEB);

    /** 자사 설비 판정. */
    public static boolean inHouse(String eqpCd) {
        return eqpCd != null && eqpCd.startsWith("T01");
    }

    /** 현황판 slug → 공정 목록. 모르는 slug 는 null. */
    public static List<ProcessDef> processesFor(String slug) {
        return switch (slug) {
            case "production-ops" -> PRODUCTION_OPS;
            case "print-part" -> PRINT_PART;
            default -> null;
        };
    }

    /** ERP 공정 코드 → 현황판 공정 코드 (품질 이슈를 공정에 묶을 때). 어디에도 안 들면 "etc". */
    public static String processCodeOf(String upOrgnCd) {
        for (ProcessDef p : PRODUCTION_OPS) {
            if (p.upOrgnCds().contains(upOrgnCd)) return p.code();
        }
        return "etc";
    }

    /** 품질(부적합) 책임부서 뿌리 — 생산운영팀. 하위 부서(제판·제본 중철 파트 등)까지 포함한다. */
    public static final String QUALITY_DEPT_ROOT = "3240";
}
