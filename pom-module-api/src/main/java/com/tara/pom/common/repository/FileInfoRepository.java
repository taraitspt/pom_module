package com.tara.pom.common.repository;

import com.tara.pom.common.entity.FileInfo;
import com.tara.pom.common.id.FileInfoId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface FileInfoRepository extends JpaRepository<FileInfo, FileInfoId> {

    /** POM 공지 첨부(file_category='NOTICE') — 여러 공지를 한 번에. 등록 순. */
    @Query("SELECT f FROM FileInfo f WHERE f.noticeId IN :noticeIds AND f.fileCategory = 'NOTICE' ORDER BY f.createdAt")
    List<FileInfo> findNoticeFiles(@Param("noticeIds") java.util.Collection<Long> noticeIds);

    /** 파일 ID 하나 — 공개 다운로드 링크(서명 검증 뒤)에서 회사·공장 없이 찾는다. */
    @Query("SELECT f FROM FileInfo f WHERE f.id.fileId = :fileId")
    java.util.Optional<FileInfo> findByFileId(@Param("fileId") String fileId);

    /** 공지사항(notice_id) 첨부파일 목록. 업로드 순서(파일ID 오름차순). */
    @Query("SELECT f FROM FileInfo f WHERE f.id.companyCd = :companyCd AND f.id.plantCd = :plantCd " +
           "AND f.noticeId = :noticeId ORDER BY f.id.fileId")
    List<FileInfo> findByNoticeId(@Param("companyCd") Integer companyCd,
                                  @Param("plantCd") Integer plantCd,
                                  @Param("noticeId") Long noticeId);
}
