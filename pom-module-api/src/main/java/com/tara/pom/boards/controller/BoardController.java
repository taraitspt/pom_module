package com.tara.pom.boards.controller;

import com.tara.pom.boards.BoardAccess;
import com.tara.pom.boards.dto.PerfBoardDto;
import com.tara.pom.boards.dto.PerfBoardDto.TargetDto;
import com.tara.pom.boards.repository.BoardKpiTargetRepository;
import com.tara.pom.boards.service.BoardPerfService;
import com.tara.pom.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

/**
 * 현황판 데이터 API (2차 — React 화면용). 1차 원본 HTML 은 {@code DashboardController} 가 그대로 내려준다.
 * 접근은 메뉴 권한 {@code /dashboards/{slug}} 로 판정({@link BoardAccess}).
 */
@Tag(name = "Boards", description = "현황판 데이터 (ERP 실적·품질 집계)")
@RestController
@RequestMapping("/api/boards")
@RequiredArgsConstructor
public class BoardController {

    private final BoardAccess access;
    private final BoardPerfService perfService;
    private final BoardKpiTargetRepository targetRepository;

    @Operation(summary = "KPI 목표 (한 해)", description = "board_kpi_target — 화면이 목표선·달성 판정에 쓴다.")
    @GetMapping("/{slug}/targets")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<List<TargetDto>> targets(@PathVariable String slug, @RequestParam(required = false) Integer year) {
        access.assertCanView(slug);
        int y = year != null ? year : LocalDate.now(ZoneId.of("Asia/Seoul")).getYear();
        return ApiResponse.ok(targetRepository.findByBoardSlugAndTargetYearOrderByMetricCdAscScopeCdAsc(slug, y).stream()
                .map(t -> new TargetDto(t.getMetricCd(), t.getScopeCd(), t.getTargetVal(), t.getNote())).toList());
    }

    @Operation(summary = "실적·품질 (한 해)", description = "생산량·생산매출·TPI·품질을 공정/설비/월로 집계. ERP 10분 캐시, refresh=true 면 다시 읽음.")
    @GetMapping("/{slug}/perf")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<PerfBoardDto> perf(@PathVariable String slug,
                                          @RequestParam(required = false) Integer year,
                                          @RequestParam(defaultValue = "false") boolean refresh) {
        access.assertCanView(slug);
        int y = year != null ? year : LocalDate.now(ZoneId.of("Asia/Seoul")).getYear();
        return ApiResponse.ok(perfService.perf(slug, y, refresh));
    }
}
