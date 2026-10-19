package com.tara.pom.boards;

import com.tara.pom.boards.entity.*;
import com.tara.pom.common.audit.BaseEntity;

import java.util.List;

/**
 * 공통 CRUD 가 다루는 입력 테이블 종류 — URL 조각, 엔티티, 날짜 필드(기간 필터·정렬), 검색 대상 텍스트 필드,
 * 현황판 slug 로 가르는지, 읽기/쓰기에 필요한 현황판 권한.
 */
public enum BoardRecordKind {

    WORK_ITEM("work-items", BoardWorkItem.class, "startDate", List.of("title", "detail", "partnerNm", "ownerNm"), true,
            List.of("production-ops", "print-part", "outsourcing", "equipment-tech"), List.of("production-ops", "print-part", "outsourcing", "equipment-tech")),
    SAFETY_ACCIDENT("safety-accidents", BoardSafetyAccident.class, "accidentDate", List.of("personNm", "deptNm", "summary", "followup"), false,
            List.of("production-ops", "print-part"), List.of("production-ops", "print-part")),
    SAFETY_ACTION("safety-actions", BoardSafetyAction.class, "actionDate", List.of("equipmentNm", "issue", "action", "ownerNm"), false,
            List.of("production-ops", "print-part"), List.of("production-ops", "print-part")),
    S3S_ACTIVITY("s3s-activities", BoardS3sActivity.class, "activityDate", List.of("improveNo", "personNm", "activityType", "content"), false,
            List.of("equipment-tech"), List.of("equipment-tech")),
    MAINT_COST("maint-costs", BoardMaintCost.class, "costDate", List.of("equipmentNm", "itemNm", "vendorNm"), false,
            List.of("equipment-tech"), List.of("equipment-tech")),
    REPORT_DOC("report-docs", BoardReportDoc.class, "reportDate", List.of("title", "content"), true,
            List.of("equipment-tech", "production-ops", "outsourcing"), List.of("equipment-tech", "production-ops", "outsourcing")),
    PROJECT("projects", BoardProject.class, "startDate", List.of("projectNm", "ownerNm", "summary"), true,
            List.of("equipment-tech"), List.of("equipment-tech")),
    PROJECT_LOG("project-logs", BoardProjectLog.class, "logDate", List.of("content", "nextPlan"), false,
            List.of("equipment-tech"), List.of("equipment-tech"));

    private final String path;
    private final Class<? extends BaseEntity> entityClass;
    private final String dateField;
    private final List<String> textFields;
    private final boolean hasBoardSlug;
    private final List<String> readerSlugs;
    private final List<String> writerSlugs;

    BoardRecordKind(String path, Class<? extends BaseEntity> entityClass, String dateField, List<String> textFields,
                    boolean hasBoardSlug, List<String> readerSlugs, List<String> writerSlugs) {
        this.path = path;
        this.entityClass = entityClass;
        this.dateField = dateField;
        this.textFields = textFields;
        this.hasBoardSlug = hasBoardSlug;
        this.readerSlugs = readerSlugs;
        this.writerSlugs = writerSlugs;
    }

    public String path() { return path; }
    public Class<? extends BaseEntity> entityClass() { return entityClass; }
    public String dateField() { return dateField; }
    public List<String> textFields() { return textFields; }
    public boolean hasBoardSlug() { return hasBoardSlug; }
    public List<String> readerSlugs() { return readerSlugs; }
    public List<String> writerSlugs() { return writerSlugs; }

    public static BoardRecordKind byPath(String path) {
        for (BoardRecordKind k : values()) if (k.path.equals(path)) return k;
        return null;
    }
}
