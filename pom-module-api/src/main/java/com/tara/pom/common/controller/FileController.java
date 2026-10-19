package com.tara.pom.common.controller;

import com.tara.pom.common.dto.ApiResponse;
import com.tara.pom.common.entity.FileInfo;
import com.tara.pom.common.service.FileService;
import com.tara.pom.common.util.SecurityContextUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;

@Tag(name = "File", description = "파일 다운로드/삭제 API — 업로드는 /api/notices/{id}/files 에서")
@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

    private final FileService fileService;

    @Operation(summary = "파일 다운로드")
    @GetMapping("/{fileId}/download")
    public ResponseEntity<Resource> download(@PathVariable String fileId) throws Exception {
        Integer companyCd = SecurityContextUtil.getCurrentCompanyCd();
        Integer plantCd = SecurityContextUtil.getCurrentPlantCd();
        int resolvedCompanyCd = companyCd != null ? companyCd : 1000;
        int resolvedPlantCd = plantCd != null ? plantCd : 1000;
        FileInfo fileInfo = fileService.getInfo(resolvedCompanyCd, resolvedPlantCd, fileId);
        Resource resource = fileService.download(
            resolvedCompanyCd,
            resolvedPlantCd,
            fileId);
        String filename = StringUtils.hasText(fileInfo.getOriginalName())
            ? fileInfo.getOriginalName()
            : resource.getFilename();
        MediaType contentType = StringUtils.hasText(fileInfo.getContentType())
            ? MediaType.parseMediaType(fileInfo.getContentType())
            : MediaType.APPLICATION_OCTET_STREAM;
        return ResponseEntity.ok()
            .contentType(contentType)
            .header(HttpHeaders.CONTENT_DISPOSITION,
                ContentDisposition.attachment()
                    .filename(filename, StandardCharsets.UTF_8)
                    .build()
                    .toString())
            .body(resource);
    }

    @Operation(summary = "파일 삭제")
    @DeleteMapping("/{fileId}")
    public ApiResponse<Void> delete(@PathVariable String fileId) throws Exception {
        Integer companyCd = SecurityContextUtil.getCurrentCompanyCd();
        Integer plantCd = SecurityContextUtil.getCurrentPlantCd();
        fileService.delete(
            companyCd != null ? companyCd : 1000,
            plantCd != null ? plantCd : 1000,
            fileId);
        return ApiResponse.ok();
    }
}
