package com.tara.pom.boards.controller;

import com.tara.pom.boards.BoardAccess;
import com.tara.pom.boards.dto.PerfBoardDto.QualityIssueDto;
import com.tara.pom.boards.service.OutsourcingService;
import com.tara.pom.boards.service.OutsourcingService.PurchaseOrderBoard;
import com.tara.pom.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

/** 외주협력팀 현황판 ERP 데이터 — 권한은 메뉴 키 /dashboards/outsourcing. */
@Tag(name = "Boards", description = "현황판 데이터")
@RestController
@RequestMapping("/api/boards/outsourcing")
@RequiredArgsConstructor
public class OutsourcingController {

    private static final String SLUG = "outsourcing";

    private final BoardAccess access;
    private final OutsourcingService service;

    @Operation(summary = "외주 발주 (협력사·담당자·일자별 집계 + 행)", description = "발주일 구간 최대 186일. 기본 이번 달 1일~오늘.")
    @GetMapping("/purchase-orders")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<PurchaseOrderBoard> purchaseOrders(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        access.assertCanView(SLUG);
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));
        LocalDate f = from != null ? from : today.withDayOfMonth(1);
        LocalDate t = to != null ? to : today;
        return ApiResponse.ok(service.purchaseOrders(f, t));
    }

    @Operation(summary = "외주 부적합 (한 해)")
    @GetMapping("/quality")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<List<QualityIssueDto>> quality(@RequestParam(required = false) Integer year) {
        access.assertCanView(SLUG);
        int y = year != null ? year : LocalDate.now(ZoneId.of("Asia/Seoul")).getYear();
        return ApiResponse.ok(service.outsourcingQuality(y));
    }
}
