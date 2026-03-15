package com.projectmanagement.repository;

import com.projectmanagement.model.WorkLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WorkLogRepository extends JpaRepository<WorkLog, Long> {
    List<WorkLog> findByTaskId(Long taskId);
    List<WorkLog> findByUserId(Long userId);
}

