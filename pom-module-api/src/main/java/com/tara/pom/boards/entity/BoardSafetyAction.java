package com.tara.pom.boards.entity;

import com.tara.pom.common.audit.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

/** 안전 조치사항 (V5). */
@Entity
@Table(name = "board_safety_action")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor @Builder
public class BoardSafetyAction extends BaseEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "action_id")
    private Long id;
    @Column(name = "action_date") private LocalDate actionDate;
    @Column(name = "process_cd", length = 20) private String processCd;
    @Column(name = "equipment_nm", length = 100) private String equipmentNm;
    @Column(name = "issue", nullable = false, length = 500) private String issue;
    @Column(name = "action", length = 1000) private String action;
    @Column(name = "owner_nm", length = 50) private String ownerNm;
    @Column(name = "status", nullable = false, length = 20) private String status;
}
