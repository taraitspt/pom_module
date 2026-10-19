package com.tara.pom.auth.repository;

import com.tara.pom.auth.entity.AuthHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthHistoryRepository extends JpaRepository<AuthHistory, Long> {
}
