package com.tara.pom.boards.entity;

import com.tara.pom.common.audit.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

/** 3정5S 활동 (V5, 설비기술). */
@Entity
@Table(name = "board_s3s_activity")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor @Builder
public class BoardS3sActivity extends BaseEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "s3s_id")
    private Long id;
    @Column(name = "activity_date", nullable = false) private LocalDate activityDate;
    @Column(name = "improve_no", length = 20) private String improveNo;
    @Column(name = "dept_nm", length = 50) private String deptNm;
    @Column(name = "person_nm", length = 50) private String personNm;
    @Column(name = "activity_type", length = 40) private String activityType;
    @Column(name = "content", nullable = false, length = 500) private String content;
}
