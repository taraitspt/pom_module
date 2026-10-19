package com.tara.pom.boards.repository;

import com.tara.pom.boards.entity.BoardKpiTarget;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BoardKpiTargetRepository extends JpaRepository<BoardKpiTarget, Long> {

    List<BoardKpiTarget> findByBoardSlugAndTargetYearOrderByMetricCdAscScopeCdAsc(String boardSlug, Integer targetYear);

    Optional<BoardKpiTarget> findByBoardSlugAndMetricCdAndScopeCdAndTargetYear(String boardSlug, String metricCd, String scopeCd, Integer targetYear);
}
