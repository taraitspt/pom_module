package com.tara.pom.boards.repository;

import com.tara.pom.boards.entity.BoardMaintCost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/** 입력 테이블(V5) — 공통 CRUD(BoardRecordService)가 종류별로 꺼내 쓴다. */
public interface MaintCostRepository extends JpaRepository<BoardMaintCost, Long>, JpaSpecificationExecutor<BoardMaintCost> {
}
