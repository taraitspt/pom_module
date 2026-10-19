package com.tara.pom.boards.entity;

import com.tara.pom.common.audit.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

/** 안전사고 사례 (V5). */
@Entity
@Table(name = "board_safety_accident")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor @Builder
public class BoardSafetyAccident extends BaseEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "accident_id")
    private Long id;
    @Column(name = "accident_date", nullable = false) private LocalDate accidentDate;
    @Column(name = "person_nm", nullable = false, length = 50) private String personNm;
    @Column(name = "dept_nm", length = 50) private String deptNm;
    @Column(name = "process_cd", length = 20) private String processCd;
    @Column(name = "summary", nullable = false, length = 500) private String summary;
    @Column(name = "followup", length = 1000) private String followup;
    @Column(name = "status", nullable = false, length = 20) private String status;
}
