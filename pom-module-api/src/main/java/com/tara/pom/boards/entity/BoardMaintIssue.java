package com.tara.pom.boards.entity;

import com.tara.pom.common.audit.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

/**
 * 설비 정비 이슈 (V4) — 설비기술파트 정비 일지. 설비기술·생산운영팀·인쇄파트 현황판이 같은 행을 본다.
 * 상태: SCHEDULED 예정 / PROGRESS 진행중 / DONE 완료 / HOLD 보류.
 */
@Entity
@Table(name = "board_maint_issue")
@Getter @Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor @Builder
public class BoardMaintIssue extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "maint_id")
    private Long id;

    @Column(name = "issue_date", nullable = false)
    private LocalDate issueDate;

    /** plate/sheet/web/saddle/perfect/coating/fold/utility/etc */
    @Column(name = "process_cd", nullable = false, length = 20)
    private String processCd;

    @Column(name = "process_nm", length = 40)
    private String processNm;

    @Column(name = "equipment_cd", length = 30)
    private String equipmentCd;

    @Column(name = "equipment_nm", nullable = false, length = 100)
    private String equipmentNm;

    @Column(name = "part_nm", length = 100)
    private String partNm;

    @Column(name = "issue_type", nullable = false, length = 40)
    private String issueType;

    @Column(name = "content", nullable = false, length = 1000)
    private String content;

    @Column(name = "vendor_nm", length = 100)
    private String vendorNm;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "owner_nm", length = 50)
    private String ownerNm;

    @Column(name = "note", length = 500)
    private String note;

    @Column(name = "source_board", length = 40)
    private String sourceBoard;

    @Column(name = "legacy_id", length = 40)
    private String legacyId;
}
