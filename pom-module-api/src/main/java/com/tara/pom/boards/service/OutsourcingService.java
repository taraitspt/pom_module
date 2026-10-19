package com.tara.pom.boards.service;

import com.tara.pom.boards.dto.BoardErpRows.QualityIssue;
import com.tara.pom.boards.dto.PerfBoardDto.QualityIssueDto;
import com.tara.pom.boards.repository.OracleBoardPerfRepository;
import com.tara.pom.boards.repository.OracleOutsourcingRepository;
import com.tara.pom.boards.repository.OracleOutsourcingRepository.PurchaseOrder;
import com.tara.pom.common.exception.BusinessException;
import com.tara.pom.common.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * 외주협력팀 현황판 — ERP 외주 발주(협력사·담당자·일자별 집계)와 외주 부적합(INOUTCOM_FG 02).
 * 확정 외주비(월마감)·마진(기준단가)은 출처 미확정이라 여기 없다.
 */
@Service
@RequiredArgsConstructor
public class OutsourcingService {

    private static final DateTimeFormatter YMD = DateTimeFormatter.BASIC_ISO_DATE;

    private final Optional<OracleOutsourcingRepository> erp;
    private final Optional<OracleBoardPerfRepository> perfErp;

    public record VendorAgg(String partnerCd, String partnerNm, String owners, int count, int orders, long amount, double share, String lastDate) {
    }

    public record OwnerAgg(String empNo, String empNm, int vendors, int count, int orders, long amount, double share) {
    }

    public record DateAgg(String date, int count, long amount) {
    }

    public record PurchaseOrderBoard(String from, String to, int count, int orders, int vendors, long amount,
                                     List<VendorAgg> byVendor, List<OwnerAgg> byOwner, List<DateAgg> byDate, List<PurchaseOrder> rows) {
    }

    public PurchaseOrderBoard purchaseOrders(LocalDate from, LocalDate to) {
        OracleOutsourcingRepository repo = erp.orElseThrow(() -> new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR, "ERP(Oracle) 연결이 꺼져 있습니다."));
        if (to.isBefore(from) || from.plusDays(185).isBefore(to)) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "조회 기간은 최대 186일입니다.");
        }
        List<PurchaseOrder> rows = repo.purchaseOrders(from.format(YMD), to.format(YMD));
        long total = rows.stream().mapToLong(PurchaseOrder::amount).sum();

        Map<String, List<PurchaseOrder>> byV = new LinkedHashMap<>();
        for (PurchaseOrder r : rows) byV.computeIfAbsent(r.partnerCd(), k -> new ArrayList<>()).add(r);
        List<VendorAgg> vendors = new ArrayList<>();
        for (List<PurchaseOrder> l : byV.values()) {
            long amt = l.stream().mapToLong(PurchaseOrder::amount).sum();
            Set<String> owners = new TreeSet<>();
            Set<String> orders = new HashSet<>();
            String last = "";
            for (PurchaseOrder r : l) {
                if (!r.empNm().isEmpty()) owners.add(r.empNm());
                if (!r.orderNo().isEmpty()) orders.add(r.orderNo());
                if (r.poDate().compareTo(last) > 0) last = r.poDate();
            }
            PurchaseOrder f = l.get(0);
            vendors.add(new VendorAgg(f.partnerCd(), f.partnerNm(), String.join(", ", owners), l.size(), orders.size(), amt,
                    share(amt, total), last));
        }
        vendors.sort(Comparator.comparingLong(VendorAgg::amount).reversed());

        Map<String, List<PurchaseOrder>> byO = new LinkedHashMap<>();
        for (PurchaseOrder r : rows) byO.computeIfAbsent(r.empNo(), k -> new ArrayList<>()).add(r);
        List<OwnerAgg> owners = new ArrayList<>();
        for (List<PurchaseOrder> l : byO.values()) {
            long amt = l.stream().mapToLong(PurchaseOrder::amount).sum();
            Set<String> v = new HashSet<>();
            Set<String> o = new HashSet<>();
            for (PurchaseOrder r : l) { v.add(r.partnerCd()); if (!r.orderNo().isEmpty()) o.add(r.orderNo()); }
            PurchaseOrder f = l.get(0);
            owners.add(new OwnerAgg(f.empNo(), f.empNm().isEmpty() ? f.empNo() : f.empNm(), v.size(), l.size(), o.size(), amt, share(amt, total)));
        }
        owners.sort(Comparator.comparingLong(OwnerAgg::amount).reversed());

        Map<String, long[]> byD = new TreeMap<>();
        for (PurchaseOrder r : rows) {
            long[] a = byD.computeIfAbsent(r.poDate(), k -> new long[2]);
            a[0]++;
            a[1] += r.amount();
        }
        List<DateAgg> dates = byD.entrySet().stream().map(e -> new DateAgg(e.getKey(), (int) e.getValue()[0], e.getValue()[1])).toList();

        Set<String> allOrders = new HashSet<>();
        for (PurchaseOrder r : rows) if (!r.orderNo().isEmpty()) allOrders.add(r.orderNo());
        return new PurchaseOrderBoard(from.toString(), to.toString(), rows.size(), allOrders.size(), byV.size(), total, vendors, owners, dates, rows);
    }

    /** 외주 부적합 — 한 해. 접수유형·부적합유형·외주 업체·공정·처리금액. */
    public List<QualityIssueDto> outsourcingQuality(int year) {
        OracleBoardPerfRepository repo = perfErp.orElseThrow(() -> new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR, "ERP(Oracle) 연결이 꺼져 있습니다."));
        List<QualityIssueDto> out = new ArrayList<>();
        for (QualityIssue i : repo.qualityIssues(year + "0101", year + "1231")) {
            if (!"02".equals(i.inoutcomFg())) continue;
            String d = i.acptDt();
            String date = d.length() == 8 ? d.substring(0, 4) + "-" + d.substring(4, 6) + "-" + d.substring(6, 8) : d;
            String pname = i.upOrgnNm().isEmpty() ? "기타" : i.upOrgnNm();
            out.add(new QualityIssueDto(i.nstbNo(), date, date.length() >= 7 ? date.substring(0, 7) : date, i.upOrgnCd(), pname,
                    i.acptTpCd(), i.acptTpNm(), i.nstbDcCd(), i.nstbDcNm(), i.eqpCd(), i.eqpNm(), i.orddocNo(), i.orddocNm(),
                    i.partnerNm(), i.inoutcomFg(), i.osrcPartnerNm(), i.procAmt(), i.rsptDeptNm(), i.rspnberNm(), i.nstbNm(), i.nstbDc()));
        }
        return out;
    }

    private static double share(long part, long whole) {
        return whole > 0 ? Math.round(part * 10000.0 / whole) / 100.0 : 0;
    }
}
