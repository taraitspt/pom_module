package com.tara.pom.boards.entity;

import com.tara.pom.common.audit.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

/** 프로젝트 (V5). */
@Entity
@Table(name = "board_project")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor @Builder
public class BoardProject extends BaseEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "project_id")
    private Long id;
    @Column(name = "board_slug", nullable = false, length = 40) private String boardSlug;
    @Column(name = "project_nm", nullable = false, length = 200) private String projectNm;
    @Column(name = "status", nullable = false, length = 20) private String status;
    @Column(name = "start_date") private LocalDate startDate;
    @Column(name = "end_date") private LocalDate endDate;
    @Column(name = "owner_nm", length = 50) private String ownerNm;
    @Column(name = "summary", length = 2000) private String summary;
}
