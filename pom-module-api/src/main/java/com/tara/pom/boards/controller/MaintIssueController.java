package com.tara.pom.boards.controller;

import com.tara.pom.boards.BoardAccess;
import com.tara.pom.boards.dto.MaintIssueDto;
import com.tara.pom.boards.service.MaintIssueService;
import com.tara.pom.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 설비 정비 이슈 API — 설비기술·생산운영팀·인쇄파트 현황판이 공유.
 * 읽기는 세 현황판 중 하나라도 볼 수 있으면, 쓰기는 설비기술 대시보드 권한(= 정비 일지 주인)이 있어야 한다.
 */
@Tag(name = "Boards", description = "현황판 데이터")
@RestController
@RequestMapping("/api/boards/maint-issues")
@RequiredArgsConstructor
public class MaintIssueController {

    private static final List<String> READERS = List.of("equipment-tech", "production-ops", "print-part");
    private static final List<String> WRITERS = List.of("equipment-tech");

    private final BoardAccess access;
    private final MaintIssueService service;

    @Operation(summary = "정비 이슈 목록", description = "등록일 구간·공정(콤마)·상태(콤마)·유형(콤마)·설비·업체·검색어")
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<MaintIssueDto.ListResponse> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String processes,
            @RequestParam(required = false) String statuses,
            @RequestParam(required = false) String types,
            @RequestParam(required = false) String equipment,
            @RequestParam(required = false) String vendor,
            @RequestParam(required = false) String q) {
        access.assertCanViewAny(READERS);
        return ApiResponse.ok(service.list(from, to, split(processes), split(statuses), split(types), equipment, vendor, q));
    }

    @Operation(summary = "선택지 (공정·상태·유형·업체·설비·파트)")
    @GetMapping("/meta")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<MaintIssueDto.Meta> meta() {
        access.assertCanViewAny(READERS);
        return ApiResponse.ok(service.meta());
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<MaintIssueDto.Item> get(@PathVariable Long id) {
        access.assertCanViewAny(READERS);
        return ApiResponse.ok(service.get(id));
    }

    @Operation(summary = "정비 이슈 등록")
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<MaintIssueDto.Item> create(@Valid @RequestBody MaintIssueDto.SaveRequest req) {
        access.assertCanViewAny(WRITERS);
        return ApiResponse.ok(service.create(req));
    }

    @Operation(summary = "정비 이슈 수정")
    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<MaintIssueDto.Item> update(@PathVariable Long id, @Valid @RequestBody MaintIssueDto.SaveRequest req) {
        access.assertCanViewAny(WRITERS);
        return ApiResponse.ok(service.update(id, req));
    }

    @Operation(summary = "상태 변경 (칸반)")
    @PatchMapping("/{id}/status")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<MaintIssueDto.Item> status(@PathVariable Long id, @Valid @RequestBody MaintIssueDto.StatusRequest req) {
        access.assertCanViewAny(WRITERS);
        return ApiResponse.ok(service.changeStatus(id, req));
    }

    @Operation(summary = "정비 이슈 삭제")
    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        access.assertCanViewAny(WRITERS);
        service.delete(id);
        return ApiResponse.ok();
    }

    private static Set<String> split(String csv) {
        if (csv == null || csv.isBlank()) return Set.of();
        return Arrays.stream(csv.split(",")).map(String::trim).filter(s -> !s.isEmpty()).collect(Collectors.toSet());
    }
}
