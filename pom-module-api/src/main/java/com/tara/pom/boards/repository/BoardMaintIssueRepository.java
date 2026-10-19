package com.tara.pom.boards.repository;

import com.tara.pom.boards.entity.BoardMaintIssue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface BoardMaintIssueRepository extends JpaRepository<BoardMaintIssue, Long>, JpaSpecificationExecutor<BoardMaintIssue> {

    @Query("SELECT DISTINCT m.issueType FROM BoardMaintIssue m ORDER BY m.issueType")
    List<String> distinctTypes();

    @Query("SELECT DISTINCT m.vendorNm FROM BoardMaintIssue m WHERE m.vendorNm IS NOT NULL ORDER BY m.vendorNm")
    List<String> distinctVendors();

    @Query("SELECT DISTINCT m.equipmentNm FROM BoardMaintIssue m ORDER BY m.equipmentNm")
    List<String> distinctEquipments();

    @Query("SELECT DISTINCT m.partNm FROM BoardMaintIssue m WHERE m.partNm IS NOT NULL ORDER BY m.partNm")
    List<String> distinctParts();
}
