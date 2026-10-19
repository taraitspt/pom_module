package com.tara.pom.boards.dto;

import com.tara.pom.boards.entity.BoardMaintIssue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** 설비 정비 이슈 API DTO. */
public final class MaintIssueDto {

    private MaintIssueDto() {
    }

    public record Item(
            Long id,
            LocalDate issueDate,
            String processCd,
            String processNm,
            String equipmentCd,
            String equipmentNm,
            String partNm,
            String issueType,
            String content,
            String vendorNm,
            String status,
            LocalDate endDate,
            String ownerNm,
            String note,
            String sourceBoard,
            String updatedAt,
            String updatedId
    ) {
        public static Item of(BoardMaintIssue m) {
            return new Item(m.getId(), m.getIssueDate(), m.getProcessCd(), m.getProcessNm(), m.getEquipmentCd(), m.getEquipmentNm(),
                    m.getPartNm(), m.getIssueType(), m.getContent(), m.getVendorNm(), m.getStatus(), m.getEndDate(), m.getOwnerNm(),
                    m.getNote(), m.getSourceBoard(),
                    m.getUpdatedAt() == null ? null : m.getUpdatedAt().toString(), m.getUpdatedId());
        }
    }

    @Getter @Setter
    public static class SaveRequest {
        @NotNull private LocalDate issueDate;
        @NotBlank @Size(max = 20) private String processCd;
        @Size(max = 40) private String processNm;
        @Size(max = 30) private String equipmentCd;
        @NotBlank @Size(max = 100) private String equipmentNm;
        @Size(max = 100) private String partNm;
        @NotBlank @Size(max = 40) private String issueType;
        @NotBlank @Size(max = 1000) private String content;
        @Size(max = 100) private String vendorNm;
        @NotBlank @Size(max = 20) private String status;
        private LocalDate endDate;
        @Size(max = 50) private String ownerNm;
        @Size(max = 500) private String note;
    }

    @Getter @Setter
    public static class StatusRequest {
        @NotBlank private String status;
        private LocalDate endDate;
    }

    /** 목록 + 상태별 건수. */
    public record ListResponse(List<Item> items, Map<String, Long> statusCounts, long total) {
    }

    /** 화면 선택지 — 공정·상태 코드표와 지금까지 입력된 유형·업체·설비·파트. */
    public record Meta(List<Code> processes, List<Code> statuses, List<String> types, List<String> vendors,
                       List<String> equipments, List<String> parts) {
    }

    public record Code(String code, String name) {
    }
}
