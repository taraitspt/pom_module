package com.tara.pom.boards.service;

import com.tara.pom.boards.BoardScope;
import com.tara.pom.boards.BoardScope.ProcessDef;
import com.tara.pom.boards.BoardScope.Split;
import com.tara.pom.boards.dto.BoardErpRows.MonthlyProduction;
import com.tara.pom.boards.dto.BoardErpRows.MonthlyTpi;
import com.tara.pom.boards.dto.BoardErpRows.QualityIssue;
import com.tara.pom.boards.dto.PerfBoardDto;
import com.tara.pom.boards.dto.PerfBoardDto.EquipmentPerf;
import com.tara.pom.boards.dto.PerfBoardDto.ProcessPerf;
import com.tara.pom.boards.dto.PerfBoardDto.QualityIssueDto;
import com.tara.pom.boards.dto.PerfBoardDto.SplitPerf;
import com.tara.pom.boards.dto.PerfBoardDto.TargetDto;
import com.tara.pom.boards.repository.BoardKpiTargetRepository;
import com.tara.pom.boards.repository.OracleBoardPerfRepository;
import com.tara.pom.common.exception.BusinessException;
import com.tara.pom.common.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * 현황판 실적·품질 집계 — ERP 원시 행(월×설비)을 공정별 시계열·설비별 누계·품질 목록으로 만든다.
 *
 * <p>판정 규칙(원본 현황판과 대조해 확정, 2026-10-19):
 * <ul>
 *   <li>생산량·생산매출: 자사 설비(T01…)만, 공정은 ERP 공정 코드로 묶는다({@link BoardScope}).</li>
 *   <li>TPI: 설비 월 TPI = 작업일 평균(소수 4자리), 공정·종합 = 그 평균(0 제외). 표시 자리수는 화면이 정한다.</li>
 *   <li>품질: 사내(INOUTCOM_FG 01) + 책임부서가 생산운영팀(3240) 하위 + 책임담당자 있음. 공정은 ERP 공정 코드로.</li>
 * </ul>
 * ERP 조회는 10분 캐시(연도 단위) — 세 쿼리를 합쳐 첫 호출 5~10초.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BoardPerfService {

    private static final long TTL_MS = 10 * 60 * 1000L;

    private final Optional<OracleBoardPerfRepository> erp;
    private final BoardKpiTargetRepository targetRepository;

    private record YearData(List<MonthlyProduction> production, List<MonthlyTpi> tpi, List<QualityIssue> quality,
                            Set<String> qualityDepts, long loadedAt) {
    }

    private final Map<Integer, YearData> cache = new ConcurrentHashMap<>();

    public PerfBoardDto perf(String slug, int year, boolean refresh) {
        List<ProcessDef> defs = BoardScope.processesFor(slug);
        if (defs == null) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "실적 현황판이 아닙니다: " + slug);
        }
        YearData d = load(year, refresh);
        List<QualityIssue> scoped = scopedQuality(d);

        List<ProcessPerf> processes = defs.stream().map(p -> buildProcess(p, d, scoped)).toList();
        int lastMonth = 0;
        for (ProcessPerf p : processes) {
            for (int m = 0; m < 12; m++) {
                if (p.production()[m] != null && p.production()[m] > 0) lastMonth = Math.max(lastMonth, m + 1);
            }
        }
        List<QualityIssueDto> issues = scoped.stream().map(BoardPerfService::toDto).toList();
        List<TargetDto> targets = targetRepository.findByBoardSlugAndTargetYearOrderByMetricCdAscScopeCdAsc(slug, year).stream()
                .map(t -> new TargetDto(t.getMetricCd(), t.getScopeCd(), t.getTargetVal(), t.getNote()))
                .toList();
        return new PerfBoardDto(slug, year, lastMonth, processes, issues, targets, LocalDateTime.now().toString());
    }

    // ------------------------------------------------------------------ ERP 로드(캐시)

    private YearData load(int year, boolean refresh) {
        OracleBoardPerfRepository repo = erp.orElseThrow(
                () -> new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR, "ERP(Oracle) 연결이 꺼져 있어 현황판 실적을 읽을 수 없습니다."));
        YearData cached = cache.get(year);
        long now = System.currentTimeMillis();
        if (!refresh && cached != null && now - cached.loadedAt() < TTL_MS) {
            return cached;
        }
        synchronized (cache) {
            cached = cache.get(year);
            if (!refresh && cached != null && System.currentTimeMillis() - cached.loadedAt() < TTL_MS) {
                return cached;
            }
            long t0 = System.currentTimeMillis();
            List<MonthlyProduction> production = repo.monthlyProduction(year);
            List<MonthlyTpi> tpi = repo.monthlyTpi(year);
            List<QualityIssue> quality = repo.qualityIssues(year + "0101", year + "1231");
            Set<String> depts = new HashSet<>(repo.deptTree(BoardScope.QUALITY_DEPT_ROOT));
            YearData fresh = new YearData(production, tpi, quality, depts, System.currentTimeMillis());
            cache.put(year, fresh);
            log.info("[boards] ERP {} 로드 — 실적 {}행 · TPI {}행 · 부적합 {}건 ({}ms)", year,
                    production.size(), tpi.size(), quality.size(), System.currentTimeMillis() - t0);
            return fresh;
        }
    }

    /** 생산운영팀 품질 범위 — 사내 + 책임부서 3240 하위 + 책임담당자 있음(원본 27건과 일치). */
    private static List<QualityIssue> scopedQuality(YearData d) {
        return d.quality().stream()
                .filter(q -> "01".equals(q.inoutcomFg()))
                .filter(q -> d.qualityDepts().contains(q.rsptDeptCd()))
                .filter(q -> !q.rspnberEmpNo().isBlank())
                .toList();
    }

    // ------------------------------------------------------------------ 공정 집계

    private static ProcessPerf buildProcess(ProcessDef def, YearData d, List<QualityIssue> issues) {
        // 설비별 행 (자사 설비, 이 공정의 ERP 공정 코드)
        Map<String, List<MonthlyProduction>> byEqp = d.production().stream()
                .filter(r -> def.upOrgnCds().contains(r.upOrgnCd()) && BoardScope.inHouse(r.eqpCd()))
                .collect(Collectors.groupingBy(MonthlyProduction::eqpCd, TreeMap::new, Collectors.toList()));
        Map<String, List<MonthlyTpi>> tpiByEqp = def.tpiCategory() == null ? Map.of() : d.tpi().stream()
                .filter(t -> def.tpiCategory().equals(t.category()))
                .collect(Collectors.groupingBy(MonthlyTpi::eqpCd));
        // TPI 만 있고 실적 행이 없는 설비도 표에 올린다(드물지만 ERP 와 같게)
        for (String eqp : tpiByEqp.keySet()) byEqp.putIfAbsent(eqp, List.of());

        List<EquipmentPerf> equipments = new ArrayList<>();
        for (Map.Entry<String, List<MonthlyProduction>> e : byEqp.entrySet()) {
            String eqpCd = e.getKey();
            Long[] prodM = new Long[12];
            Long[] revM = new Long[12];
            String name = "";
            String splitCode = null;
            for (MonthlyProduction r : e.getValue()) {
                int m = monthIndex(r.ym());
                if (m < 0) continue;
                long qty = def.qtyField() == BoardScope.QtyField.MV ? r.mvQt() : r.netQt();
                prodM[m] = nvl(prodM[m]) + qty;
                revM[m] = nvl(revM[m]) + r.wrkAmt();
                if (name.isEmpty()) name = r.eqpNm();
                if (splitCode == null) splitCode = splitOf(def, r.upOrgnCd());
            }
            Double[] tpiM = new Double[12];
            List<MonthlyTpi> tl = tpiByEqp.getOrDefault(eqpCd, List.of());
            for (MonthlyTpi t : tl) {
                int m = monthIndex(t.ym());
                if (m >= 0) tpiM[m] = round2(t.tpi());
                if (name.isEmpty()) name = t.eqpNm();
            }
            int q = 0;
            long qc = 0;
            for (QualityIssue i : issues) {
                if (eqpCd.equals(i.eqpCd())) { q++; qc += i.procAmt(); }
            }
            equipments.add(new EquipmentPerf(eqpCd, name.isEmpty() ? eqpCd : name, splitCode,
                    sum(prodM), sum(revM), avgNonZero(tpiM), q, qc, tpiM, prodM, revM));
        }

        Long[] prod = new Long[12];
        Long[] rev = new Long[12];
        Double[] tpi = new Double[12];
        for (int m = 0; m < 12; m++) {
            long ps = 0, rs = 0;
            boolean any = false;
            List<Double> tpis = new ArrayList<>();
            for (EquipmentPerf eq : equipments) {
                if (eq.productionMonthly()[m] != null) { ps += eq.productionMonthly()[m]; any = true; }
                if (eq.revenueMonthly()[m] != null) rs += eq.revenueMonthly()[m];
                Double t = eq.tpiMonthly()[m];
                if (t != null && t != 0) tpis.add(t);
            }
            if (any) { prod[m] = ps; rev[m] = rs; }
            if (!tpis.isEmpty()) tpi[m] = round2(tpis.stream().mapToDouble(Double::doubleValue).average().orElse(0));
        }
        Integer[] qCnt = new Integer[12];
        Long[] qCost = new Long[12];
        for (int m = 0; m < 12; m++) { qCnt[m] = 0; qCost[m] = 0L; }
        for (QualityIssue i : issues) {
            if (!def.code().equals(BoardScope.processCodeOf(i.upOrgnCd()))) continue;
            int m = monthIndex(i.acptDt().substring(0, 6));
            if (m < 0) continue;
            qCnt[m] = qCnt[m] + 1;
            qCost[m] = qCost[m] + i.procAmt();
        }

        Map<String, SplitPerf> splits = new LinkedHashMap<>();
        for (Split s : def.splitBy()) {
            Long[] sp = new Long[12];
            Long[] sr = new Long[12];
            for (EquipmentPerf eq : equipments) {
                if (!s.code().equals(eq.splitCode())) continue;
                for (int m = 0; m < 12; m++) {
                    if (eq.productionMonthly()[m] != null) sp[m] = nvl(sp[m]) + eq.productionMonthly()[m];
                    if (eq.revenueMonthly()[m] != null) sr[m] = nvl(sr[m]) + eq.revenueMonthly()[m];
                }
            }
            splits.put(s.code(), new SplitPerf(s.name(), s.unit(), sp, sr));
        }
        return new ProcessPerf(def.code(), def.name(), def.unit(), def.tpiCategory() != null,
                tpi, qCnt, qCost, prod, rev, equipments, splits);
    }

    private static String splitOf(ProcessDef def, String upOrgnCd) {
        for (Split s : def.splitBy()) {
            if (s.upOrgnCds().contains(upOrgnCd)) return s.code();
        }
        return null;
    }

    private static QualityIssueDto toDto(QualityIssue i) {
        String d = i.acptDt();
        String date = d.length() == 8 ? d.substring(0, 4) + "-" + d.substring(4, 6) + "-" + d.substring(6, 8) : d;
        String code = BoardScope.processCodeOf(i.upOrgnCd());
        String pname = BoardScope.PRODUCTION_OPS.stream().filter(p -> p.code().equals(code)).map(ProcessDef::name).findFirst()
                .orElse(i.upOrgnNm().isEmpty() ? "기타" : i.upOrgnNm());
        return new QualityIssueDto(i.nstbNo(), date, date.length() >= 7 ? date.substring(0, 7) : date, code, pname,
                i.acptTpCd(), i.acptTpNm(), i.nstbDcCd(), i.nstbDcNm(), i.eqpCd(), i.eqpNm(),
                i.orddocNo(), i.orddocNm(), i.partnerNm(), i.inoutcomFg(), i.osrcPartnerNm(), i.procAmt(),
                i.rsptDeptNm(), i.rspnberNm(), i.nstbNm(), i.nstbDc());
    }

    // ------------------------------------------------------------------ 보조

    private static int monthIndex(String ym) {
        if (ym == null || ym.length() < 6) return -1;
        try {
            int m = Integer.parseInt(ym.substring(4, 6));
            return m >= 1 && m <= 12 ? m - 1 : -1;
        } catch (NumberFormatException e) {
            return -1;
        }
    }

    private static long nvl(Long v) {
        return v == null ? 0L : v;
    }

    private static long sum(Long[] arr) {
        long s = 0;
        for (Long v : arr) if (v != null) s += v;
        return s;
    }

    private static Double avgNonZero(Double[] arr) {
        double s = 0;
        int n = 0;
        for (Double v : arr) if (v != null && v != 0) { s += v; n++; }
        return n == 0 ? null : round2(s / n);
    }

    /** 원본 현황판은 설비 월 TPI 를 반올림하지 않은 채 평균해 소수 4자리로 보여준다(매엽 1월 0.8147). ERP 화면은 2자리 표시만 한다. */
    private static double round2(double v) {
        return Math.round(v * 10000.0) / 10000.0;
    }
}
