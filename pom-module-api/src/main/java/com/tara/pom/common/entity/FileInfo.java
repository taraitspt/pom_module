package com.tara.pom.common.entity;

import com.tara.pom.common.audit.BaseEntity;
import com.tara.pom.common.id.FileInfoId;
import jakarta.persistence.*;
import lombok.*;

/**
 * 업로드 파일 메타. POM 에서는 공지사항 첨부(notice_id, file_category='NOTICE')만 쓴다.
 * 2026-10-19 스쿼시 — 옛 SM 의 주문(order_no/order_sq)·외주발주(po_no)·비대면결제(untact_no)·매출(sales_no) 매핑 컬럼은 뺐다.
 */
@Entity
@Table(name = "file_info")
@Getter @Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor @Builder
public class FileInfo extends BaseEntity {

    @EmbeddedId
    private FileInfoId id;

    /** 공지사항(notice.notice_id) 첨부파일 매핑. */
    @Column(name = "notice_id")
    private Long noticeId;

    @Column(name = "original_name", nullable = false)
    private String originalName;

    @Column(name = "stored_name", nullable = false)
    private String storedName;

    @Column(name = "file_path", nullable = false, length = 500)
    private String filePath;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "content_type", length = 100)
    private String contentType;

    /** 파일 용도 구분. 'NOTICE' = 공지 첨부. */
    @Column(name = "file_category", length = 20)
    private String fileCategory;
}
