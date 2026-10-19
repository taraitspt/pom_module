package com.tara.pom.boards.controller;

import com.tara.pom.boards.BoardAccess;
import com.tara.pom.boards.BoardRecordKind;
import com.tara.pom.boards.service.BoardRecordService;
import com.tara.pom.common.dto.ApiResponse;
import com.tara.pom.common.exception.BusinessException;
import com.tara.pom.common.exception.ErrorCode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

/**
 * 현황판 입력 테이블 공통 CRUD — {@code /api/boards/records/{kind}} (kind = {@link BoardRecordKind#path()}).
 * 목록 파라미터: from·to(날짜 필드), q(검색), 그 외는 "필드=값" 동등 필터(콤마로 여러 값).
 * 권한은 종류별 현황판 메뉴 권한(읽기/쓰기 각각).
 */
@Tag(name = "Boards", description = "현황판 데이터")
@RestController
@RequestMapping("/api/boards/records/{kind}")
@RequiredArgsConstructor
public class BoardRecordController {

    private static final Set<String> RESERVED = Set.of("from", "to", "q");

    private final BoardAccess access;
    private final BoardRecordService service;

    @Operation(summary = "목록")
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<BoardRecordService.ListResult> list(@PathVariable String kind,
                                                           @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                                           @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                                           @RequestParam(required = false) String q,
                                                           @RequestParam Map<String, String> all) {
        BoardRecordKind k = kind(kind);
        access.assertCanViewAny(k.readerSlugs());
        Map<String, String> equals = new HashMap<>(all);
        RESERVED.forEach(equals::remove);
        return ApiResponse.ok(service.list(k, from, to, q, equals));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Object> get(@PathVariable String kind, @PathVariable Long id) {
        BoardRecordKind k = kind(kind);
        access.assertCanViewAny(k.readerSlugs());
        return ApiResponse.ok(service.get(k, id));
    }

    @Operation(summary = "등록")
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Object> create(@PathVariable String kind, @RequestBody Map<String, Object> body) {
        BoardRecordKind k = kind(kind);
        access.assertCanViewAny(k.writerSlugs());
        return ApiResponse.ok(service.create(k, body));
    }

    @Operation(summary = "수정 (전체 교체)")
    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Object> update(@PathVariable String kind, @PathVariable Long id, @RequestBody Map<String, Object> body) {
        BoardRecordKind k = kind(kind);
        access.assertCanViewAny(k.writerSlugs());
        return ApiResponse.ok(service.update(k, id, body));
    }

    @Operation(summary = "삭제")
    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Void> delete(@PathVariable String kind, @PathVariable Long id) {
        BoardRecordKind k = kind(kind);
        access.assertCanViewAny(k.writerSlugs());
        service.delete(k, id);
        return ApiResponse.ok();
    }

    private static BoardRecordKind kind(String path) {
        BoardRecordKind k = BoardRecordKind.byPath(path);
        if (k == null) throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "없는 종류입니다: " + path);
        return k;
    }
}
