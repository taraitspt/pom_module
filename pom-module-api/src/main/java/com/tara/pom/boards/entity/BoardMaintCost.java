package com.tara.pom.boards.entity;

import com.tara.pom.common.audit.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

/** 설비 구입·수리 비용 (V5, 설비기술 구입수리 현황). */
@Entity
@Table(name = "board_maint_cost")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor @Builder
public class BoardMaintCost extends BaseEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "cost_id")
    private Long id;
    @Column(name = "cost_date", nullable = false) private LocalDate costDate;
    @Column(name = "process_cd", length = 20) private String processCd;
    @Column(name = "equipment_nm", length = 100) private String equipmentNm;
    /** PURCHASE 구입 / PART_REPAIR 부품수리 / REPAIR 수리 */
    @Column(name = "cost_type", nullable = false, length = 20) private String costType;
    @Column(name = "item_nm", nullable = false, length = 300) private String itemNm;
    @Column(name = "vendor_nm", length = 100) private String vendorNm;
    @Column(name = "amount", nullable = false) private Long amount;
    /** PLANNED 계획정비 / URGENT 긴급정비 */
    @Column(name = "maint_type", length = 20) private String maintType;
    @Column(name = "hours", precision = 6, scale = 1) private BigDecimal hours;
    @Column(name = "self_yn", length = 1) private String selfYn;
    @Column(name = "maint_id") private Long maintId;
    @Column(name = "note", length = 500) private String note;
}
