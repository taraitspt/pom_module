package com.tara.pom.boards.entity;

import com.tara.pom.common.audit.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

/** 프로젝트 일자별 일지 (V5). */
@Entity
@Table(name = "board_project_log")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor @Builder
public class BoardProjectLog extends BaseEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "log_id")
    private Long id;
    @Column(name = "project_id", nullable = false) private Long projectId;
    @Column(name = "log_date", nullable = false) private LocalDate logDate;
    @Column(name = "workers") private Integer workers;
    @Column(name = "content", nullable = false, length = 2000) private String content;
    @Column(name = "next_plan", length = 1000) private String nextPlan;
}
