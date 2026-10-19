package com.tara.pom.common.service;

import com.tara.pom.common.entity.FileInfo;
import com.tara.pom.common.exception.BusinessException;
import com.tara.pom.common.exception.ErrorCode;
import com.tara.pom.common.id.FileInfoId;
import com.tara.pom.common.repository.FileInfoRepository;
import com.tara.pom.common.util.SecurityContextUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;

/** 파일 업로드/다운로드. POM 에서는 공지사항 첨부만 쓴다(권한·형식 검사는 NoticeService 에서). */
@Service
@RequiredArgsConstructor
public class FileService {

    private final FileInfoRepository fileRepo;

    @Value("${file.upload-dir:./uploads}")
    private String uploadDir;

    private static final long MAX_SIZE = 500L * 1024 * 1024;

    /** 공지사항(notice.notice_id) 첨부 업로드 — file_category='NOTICE'. */
    @Transactional
    public FileInfo uploadForNotice(MultipartFile file, Long noticeId) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "첨부파일이 비어 있습니다.");
        }
        return saveFile(file, "notice", b -> b.noticeId(noticeId).fileCategory("NOTICE"));
    }

    /** 공지사항 첨부 목록. */
    @Transactional(readOnly = true)
    public java.util.List<FileInfo> listByNotice(Integer companyCd, Integer plantCd, Long noticeId) {
        return fileRepo.findByNoticeId(companyCd, plantCd, noticeId);
    }

    private FileInfo saveFile(MultipartFile file, String subdir,
                               java.util.function.Function<FileInfo.FileInfoBuilder, FileInfo.FileInfoBuilder> apply) throws IOException {
        if (file.getSize() > MAX_SIZE) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "파일 크기가 500MB를 초과합니다.");
        }
        Integer companyCd = SecurityContextUtil.getCurrentCompanyCd();
        if (companyCd == null) companyCd = 1000;
        Integer plantCd = 2000;

        String fileId = UUID.randomUUID().toString();
        // 원본 파일명에서 경로 성분(/, \)을 제거해 basename 만 사용 — '../../' 등 경로 이탈(디렉터리 밖 쓰기) 차단.
        String raw = file.getOriginalFilename();
        String safeName = (raw == null) ? "file" : raw.replaceAll("^.*[/\\]", "");
        if (safeName.isBlank()) safeName = "file";
        String storedName = fileId + "_" + safeName;
        Path dir = Paths.get(uploadDir, subdir).normalize();
        Files.createDirectories(dir);
        Path target = dir.resolve(storedName).normalize();
        // 방어적 확인 — 정규화 후에도 업로드 디렉터리 밖이면 거부.
        if (!target.startsWith(dir)) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "잘못된 파일명입니다.");
        }
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

        FileInfo.FileInfoBuilder builder = FileInfo.builder()
            .id(new FileInfoId(companyCd, plantCd, fileId))
            .originalName(file.getOriginalFilename())
            .storedName(storedName)
            .filePath(target.toString())
            .fileSize(file.getSize())
            .contentType(file.getContentType());
        return fileRepo.save(apply.apply(builder).build());
    }

    @Transactional(readOnly = true)
    public FileInfo getInfo(Integer companyCd, Integer plantCd, String fileId) {
        return fileRepo.findById(new FileInfoId(companyCd, plantCd, fileId))
            .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "File not found."));
    }

    @Transactional(readOnly = true)
    public Resource download(Integer companyCd, Integer plantCd, String fileId) throws IOException {
        FileInfo f = fileRepo.findById(new FileInfoId(companyCd, plantCd, fileId))
            .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "파일을 찾을 수 없습니다."));
        return new UrlResource(Paths.get(f.getFilePath()).toUri());
    }

    @Transactional
    public void delete(Integer companyCd, Integer plantCd, String fileId) throws IOException {
        FileInfo f = fileRepo.findById(new FileInfoId(companyCd, plantCd, fileId))
            .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "파일을 찾을 수 없습니다."));
        Files.deleteIfExists(Paths.get(f.getFilePath()));
        fileRepo.delete(f);
    }
}
