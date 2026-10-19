package com.tara.pom.boards.entity;

import com.tara.pom.common.audit.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * 현황판 KPI 목표값 (V3). 원본 현황판에 박혀 있던 연목표(TPI 0.83, 3정5S 72건, 계획정비 70% …)를 DB 로 옮긴 것.
 * 키 = 현황판 slug × 지표 × 범위 × 연도. 범위는 ALL(현황판 전체) 또는 공정 코드(sheet/web …) 또는 설비코드.
 */
@Entity
@Table(name = "board_kpi_target")
@Getter @Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor @Builder
public class BoardKpiTarget extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "target_id")
    private Long id;

    @Column(name = "board_slug", nullable = false, length = 40)
    private String boardSlug;

    @Column(name = "metric_cd", nullable = false, length = 30)
    private String metricCd;

    @Column(name = "scope_cd", nullable = false, length = 40)
    private String scopeCd;

    @Column(name = "target_year", nullable = false)
    private Integer targetYear;

    @Column(name = "target_val", nullable = false)
    private Double targetVal;

    @Column(name = "note", length = 200)
    private String note;
}
