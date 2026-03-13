package com.projectmanagement.repository;

import com.projectmanagement.model.Task;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByProjectId(Long projectId);
    List<Task> findByAssigneeId(Long assigneeId);
    List<Task> findByProjectIdAndStatus(Long projectId, Task.Status status);
    List<Task> findByDeadlineBeforeAndStatusNot(LocalDate date, Task.Status status);
}
