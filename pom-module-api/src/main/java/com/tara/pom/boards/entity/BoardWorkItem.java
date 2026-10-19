package com.tara.pom.boards.entity;

import com.tara.pom.common.audit.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

/** 업무·과제 (V5). 생산운영팀·인쇄파트 '업무·과제', 외주협력팀 '일일 업무'. */
@Entity
@Table(name = "board_work_item")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor @Builder
public class BoardWorkItem extends BaseEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "item_id")
    private Long id;
    @Column(name = "board_slug", nullable = false, length = 40) private String boardSlug;
    @Column(name = "process_cd", length = 20) private String processCd;
    @Column(name = "category", length = 20) private String category;
    @Column(name = "title", nullable = false, length = 300) private String title;
    @Column(name = "detail", length = 1000) private String detail;
    @Column(name = "partner_nm", length = 100) private String partnerNm;
    @Column(name = "owner_nm", length = 50) private String ownerNm;
    @Column(name = "start_date") private LocalDate startDate;
    @Column(name = "due_date") private LocalDate dueDate;
    @Column(name = "end_date") private LocalDate endDate;
    @Column(name = "status", nullable = false, length = 20) private String status;
    @Column(name = "note", length = 500) private String note;
}
