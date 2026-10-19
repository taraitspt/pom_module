package com.tara.pom.boards.entity;

import com.tara.pom.common.audit.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

/** 보고서 (V5) — DAILY/WEEKLY/MONTHLY 텍스트. (board_slug, report_type, report_key) 유일. */
@Entity
@Table(name = "board_report_doc")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor @Builder
public class BoardReportDoc extends BaseEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "report_id")
    private Long id;
    @Column(name = "board_slug", nullable = false, length = 40) private String boardSlug;
    @Column(name = "report_type", nullable = false, length = 10) private String reportType;
    @Column(name = "report_key", nullable = false, length = 10) private String reportKey;
    @Column(name = "report_date", nullable = false) private LocalDate reportDate;
    @Column(name = "title", length = 200) private String title;
    @Column(name = "content", nullable = false, columnDefinition = "TEXT") private String content;
}
