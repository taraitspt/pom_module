package com.tara.pom.boards.service;

import com.tara.pom.boards.dto.MaintIssueDto;
import com.tara.pom.boards.dto.MaintIssueDto.Code;
import com.tara.pom.boards.dto.MaintIssueDto.Item;
import com.tara.pom.boards.entity.BoardMaintIssue;
import com.tara.pom.boards.repository.BoardMaintIssueRepository;
import com.tara.pom.common.exception.BusinessException;
import com.tara.pom.common.exception.ErrorCode;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/** 설비 정비 이슈 — 조회(필터)·등록·수정·상태 변경·삭제. */
@Service
@RequiredArgsConstructor
public class MaintIssueService {

    public static final List<Code> PROCESSES = List.of(
            new Code("plate", "제판"), new Code("sheet", "매엽"), new Code("web", "윤전"), new Code("saddle", "중철"),
            new Code("perfect", "무선"), new Code("coating", "코팅·톰슨"), new Code("fold", "접지"),
            new Code("utility", "유틸리티"), new Code("etc", "기타"));
    public static final List<Code> STATUSES = List.of(
            new Code("SCHEDULED", "예정"), new Code("PROGRESS", "진행중"), new Code("DONE", "완료"), new Code("HOLD", "보류"));
    private static final Set<String> PROCESS_CODES = PROCESSES.stream().map(Code::code).collect(Collectors.toSet());
    private static final Set<String> STATUS_CODES = STATUSES.stream().map(Code::code).collect(Collectors.toSet());

    private final BoardMaintIssueRepository repo;

    /** 필터 조회. processes 는 콤마 구분 코드, 비면 전체. q 는 설비명·내용·업체·파트 LIKE. */
    @Transactional(readOnly = true)
    public MaintIssueDto.ListResponse list(LocalDate from, LocalDate to, Set<String> processes, Set<String> statuses,
                                           Set<String> types, String equipment, String vendor, String q) {
        Specification<BoardMaintIssue> spec = (root, cq, cb) -> {
            List<Predicate> ps = new ArrayList<>();
            if (from != null) ps.add(cb.greaterThanOrEqualTo(root.get("issueDate"), from));
            if (to != null) ps.add(cb.lessThanOrEqualTo(root.get("issueDate"), to));
            if (processes != null && !processes.isEmpty()) ps.add(root.get("processCd").in(processes));
            if (statuses != null && !statuses.isEmpty()) ps.add(root.get("status").in(statuses));
            if (types != null && !types.isEmpty()) ps.add(root.get("issueType").in(types));
            if (equipment != null && !equipment.isBlank()) ps.add(cb.equal(root.get("equipmentNm"), equipment.trim()));
            if (vendor != null && !vendor.isBlank()) ps.add(cb.equal(root.get("vendorNm"), vendor.trim()));
            if (q != null && !q.isBlank()) {
                String like = "%" + q.trim() + "%";
                ps.add(cb.or(cb.like(root.get("content"), like), cb.like(root.get("equipmentNm"), like),
                        cb.like(cb.coalesce(root.get("vendorNm"), ""), like), cb.like(cb.coalesce(root.get("partNm"), ""), like)));
            }
            return cb.and(ps.toArray(new Predicate[0]));
        };
        List<BoardMaintIssue> rows = repo.findAll(spec, Sort.by(Sort.Direction.DESC, "issueDate").and(Sort.by(Sort.Direction.DESC, "id")));
        Map<String, Long> counts = new LinkedHashMap<>();
        for (Code s : STATUSES) counts.put(s.code(), 0L);
        for (BoardMaintIssue m : rows) counts.merge(m.getStatus(), 1L, Long::sum);
        return new MaintIssueDto.ListResponse(rows.stream().map(Item::of).toList(), counts, rows.size());
    }

    @Transactional(readOnly = true)
    public Item get(Long id) {
        return Item.of(find(id));
    }

    @Transactional(readOnly = true)
    public MaintIssueDto.Meta meta() {
        return new MaintIssueDto.Meta(PROCESSES, STATUSES, repo.distinctTypes(), repo.distinctVendors(),
                repo.distinctEquipments(), repo.distinctParts());
    }

    @Transactional
    public Item create(MaintIssueDto.SaveRequest req) {
        validate(req);
        BoardMaintIssue m = BoardMaintIssue.builder().build();
        apply(m, req);
        return Item.of(repo.save(m));
    }

    @Transactional
    public Item update(Long id, MaintIssueDto.SaveRequest req) {
        validate(req);
        BoardMaintIssue m = find(id);
        apply(m, req);
        return Item.of(repo.save(m));
    }

    /** 칸반 드롭다운 — 상태만 바꾼다. 완료로 바꾸면서 완료일이 없으면 오늘. */
    @Transactional
    public Item changeStatus(Long id, MaintIssueDto.StatusRequest req) {
        if (!STATUS_CODES.contains(req.getStatus())) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "상태 코드가 올바르지 않습니다: " + req.getStatus());
        }
        BoardMaintIssue m = find(id);
        m.setStatus(req.getStatus());
        if ("DONE".equals(req.getStatus())) {
            m.setEndDate(req.getEndDate() != null ? req.getEndDate() : (m.getEndDate() != null ? m.getEndDate() : LocalDate.now()));
        } else if (req.getEndDate() != null) {
            m.setEndDate(req.getEndDate());
        }
        return Item.of(repo.save(m));
    }

    @Transactional
    public void delete(Long id) {
        repo.delete(find(id));
    }

    private BoardMaintIssue find(Long id) {
        return repo.findById(id).orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "정비 이슈를 찾을 수 없습니다: " + id));
    }

    private static void validate(MaintIssueDto.SaveRequest req) {
        if (!PROCESS_CODES.contains(req.getProcessCd())) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "공정 코드가 올바르지 않습니다: " + req.getProcessCd());
        }
        if (!STATUS_CODES.contains(req.getStatus())) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "상태 코드가 올바르지 않습니다: " + req.getStatus());
        }
    }

    private static void apply(BoardMaintIssue m, MaintIssueDto.SaveRequest r) {
        m.setIssueDate(r.getIssueDate());
        m.setProcessCd(r.getProcessCd());
        m.setProcessNm(blankToNull(r.getProcessNm()));
        m.setEquipmentCd(blankToNull(r.getEquipmentCd()));
        m.setEquipmentNm(r.getEquipmentNm().trim());
        m.setPartNm(blankToNull(r.getPartNm()));
        m.setIssueType(r.getIssueType().trim());
        m.setContent(r.getContent().trim());
        m.setVendorNm(blankToNull(r.getVendorNm()));
        m.setStatus(r.getStatus());
        m.setEndDate("DONE".equals(r.getStatus()) && r.getEndDate() == null ? LocalDate.now() : r.getEndDate());
        m.setOwnerNm(blankToNull(r.getOwnerNm()));
        m.setNote(blankToNull(r.getNote()));
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
