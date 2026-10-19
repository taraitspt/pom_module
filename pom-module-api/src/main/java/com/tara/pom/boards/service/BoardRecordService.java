package com.tara.pom.boards.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tara.pom.boards.BoardRecordKind;
import com.tara.pom.boards.repository.*;
import com.tara.pom.common.audit.BaseEntity;
import com.tara.pom.common.exception.BusinessException;
import com.tara.pom.common.exception.ErrorCode;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;

/**
 * 현황판 입력 테이블 공통 CRUD — 종류({@link BoardRecordKind})마다 엔티티·리포지토리를 골라 같은 방식으로 다룬다.
 * 입력은 JSON 객체(필드명 = 엔티티 속성명)이고, 기간·검색어·동등 필터를 받는다. 없는 필드는 무시한다.
 */
@Slf4j
@Service
public class BoardRecordService {

    private static final Set<String> AUDIT = Set.of("id", "createdAt", "createdId", "updatedAt", "updatedId");

    public record ListResult(List<Object> items, Map<String, Long> statusCounts, long total) {
    }

    private record Repo(JpaRepository<Object, Long> jpa, JpaSpecificationExecutor<Object> spec) {
    }

    private final Map<BoardRecordKind, Repo> repos = new EnumMap<>(BoardRecordKind.class);
    private final ObjectMapper objectMapper;

    @SuppressWarnings("unchecked")
    public BoardRecordService(ObjectMapper objectMapper,
                              WorkItemRepository workItems, SafetyAccidentRepository accidents, SafetyActionRepository actions,
                              S3sActivityRepository s3s, MaintCostRepository costs, ReportDocRepository reports,
                              ProjectRepository projects, ProjectLogRepository logs) {
        this.objectMapper = objectMapper;
        repos.put(BoardRecordKind.WORK_ITEM, new Repo((JpaRepository<Object, Long>) (JpaRepository<?, Long>) workItems, (JpaSpecificationExecutor<Object>) (JpaSpecificationExecutor<?>) workItems));
        repos.put(BoardRecordKind.SAFETY_ACCIDENT, new Repo((JpaRepository<Object, Long>) (JpaRepository<?, Long>) accidents, (JpaSpecificationExecutor<Object>) (JpaSpecificationExecutor<?>) accidents));
        repos.put(BoardRecordKind.SAFETY_ACTION, new Repo((JpaRepository<Object, Long>) (JpaRepository<?, Long>) actions, (JpaSpecificationExecutor<Object>) (JpaSpecificationExecutor<?>) actions));
        repos.put(BoardRecordKind.S3S_ACTIVITY, new Repo((JpaRepository<Object, Long>) (JpaRepository<?, Long>) s3s, (JpaSpecificationExecutor<Object>) (JpaSpecificationExecutor<?>) s3s));
        repos.put(BoardRecordKind.MAINT_COST, new Repo((JpaRepository<Object, Long>) (JpaRepository<?, Long>) costs, (JpaSpecificationExecutor<Object>) (JpaSpecificationExecutor<?>) costs));
        repos.put(BoardRecordKind.REPORT_DOC, new Repo((JpaRepository<Object, Long>) (JpaRepository<?, Long>) reports, (JpaSpecificationExecutor<Object>) (JpaSpecificationExecutor<?>) reports));
        repos.put(BoardRecordKind.PROJECT, new Repo((JpaRepository<Object, Long>) (JpaRepository<?, Long>) projects, (JpaSpecificationExecutor<Object>) (JpaSpecificationExecutor<?>) projects));
        repos.put(BoardRecordKind.PROJECT_LOG, new Repo((JpaRepository<Object, Long>) (JpaRepository<?, Long>) logs, (JpaSpecificationExecutor<Object>) (JpaSpecificationExecutor<?>) logs));
    }

    /**
     * 목록. from/to 는 종류의 날짜 필드에, q 는 텍스트 필드 LIKE, equals 는 "필드=값" 동등 조건(없는 필드는 무시).
     */
    @Transactional(readOnly = true)
    public ListResult list(BoardRecordKind kind, LocalDate from, LocalDate to, String q, Map<String, String> equals) {
        Repo repo = repos.get(kind);
        Specification<Object> spec = (root, cq, cb) -> {
            List<Predicate> ps = new ArrayList<>();
            Path<LocalDate> date = root.get(kind.dateField());
            if (from != null) ps.add(cb.greaterThanOrEqualTo(date, from));
            if (to != null) ps.add(cb.lessThanOrEqualTo(date, to));
            for (Map.Entry<String, String> e : equals.entrySet()) {
                if (!hasAttribute(root, e.getKey()) || e.getValue() == null || e.getValue().isBlank()) continue;
                String[] vals = e.getValue().split(",");
                if (vals.length == 1) {
                    ps.add(cb.equal(root.get(e.getKey()).as(String.class), vals[0].trim()));
                } else {
                    ps.add(root.get(e.getKey()).as(String.class).in(Arrays.stream(vals).map(String::trim).toList()));
                }
            }
            if (q != null && !q.isBlank()) {
                String like = "%" + q.trim() + "%";
                List<Predicate> ors = new ArrayList<>();
                for (String f : kind.textFields()) {
                    if (hasAttribute(root, f)) ors.add(cb.like(cb.coalesce(root.get(f).as(String.class), ""), like));
                }
                if (!ors.isEmpty()) ps.add(cb.or(ors.toArray(new Predicate[0])));
            }
            return cb.and(ps.toArray(new Predicate[0]));
        };
        List<Object> rows = repo.spec().findAll(spec, Sort.by(Sort.Direction.DESC, kind.dateField()).and(Sort.by(Sort.Direction.DESC, "id")));
        Map<String, Long> counts = new LinkedHashMap<>();
        for (Object r : rows) {
            Object st = readProperty(r, "status");
            if (st != null) counts.merge(String.valueOf(st), 1L, Long::sum);
        }
        return new ListResult(rows, counts, rows.size());
    }

    @Transactional(readOnly = true)
    public Object get(BoardRecordKind kind, Long id) {
        return find(kind, id);
    }

    @Transactional
    public Object create(BoardRecordKind kind, Map<String, Object> body) {
        Object entity = convert(kind, body);
        return save(kind, entity);
    }

    @Transactional
    public Object update(BoardRecordKind kind, Long id, Map<String, Object> body) {
        Object target = find(kind, id);
        Object src = convert(kind, body);
        BeanUtils.copyProperties(src, target, AUDIT.toArray(new String[0]));
        return save(kind, target);
    }

    @Transactional
    public void delete(BoardRecordKind kind, Long id) {
        repos.get(kind).jpa().delete(find(kind, id));
    }

    private Object save(BoardRecordKind kind, Object entity) {
        try {
            Object saved = repos.get(kind).jpa().save(entity);
            repos.get(kind).jpa().flush();
            return saved;
        } catch (DataIntegrityViolationException e) {
            log.warn("[boards] {} 저장 실패: {}", kind, e.getMostSpecificCause().getMessage());
            throw new BusinessException(ErrorCode.INVALID_INPUT, "필수 항목이 비었거나 값이 너무 깁니다.");
        }
    }

    private Object find(BoardRecordKind kind, Long id) {
        return repos.get(kind).jpa().findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, kind.path() + " " + id + " 를 찾을 수 없습니다."));
    }

    private Object convert(BoardRecordKind kind, Map<String, Object> body) {
        Map<String, Object> clean = new HashMap<>(body);
        AUDIT.forEach(clean::remove);
        try {
            BaseEntity e = objectMapper.convertValue(clean, kind.entityClass());
            return e;
        } catch (IllegalArgumentException ex) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "입력 형식이 올바르지 않습니다: " + ex.getMessage());
        }
    }

    private static boolean hasAttribute(Root<Object> root, String name) {
        try {
            root.get(name);
            return true;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    private static Object readProperty(Object bean, String name) {
        try {
            var pd = BeanUtils.getPropertyDescriptor(bean.getClass(), name);
            return pd == null || pd.getReadMethod() == null ? null : pd.getReadMethod().invoke(bean);
        } catch (Exception e) {
            return null;
        }
    }
}
