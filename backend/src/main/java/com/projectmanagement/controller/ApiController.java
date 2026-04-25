package com.projectmanagement.controller;

import com.projectmanagement.model.*;
import com.projectmanagement.service.AppService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ApiController {

    private final AppService service;

    @PostMapping("/auth/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(service.register(body));
    }

    @PostMapping("/auth/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(service.login(body));
    }

    @PostMapping("/auth/logout")
    public ResponseEntity<Void> logout(@RequestHeader("Authorization") String auth) {
        if (auth != null && auth.startsWith("Bearer ")) service.logout(auth.substring(7));
        return ResponseEntity.ok().build();
    }

    @GetMapping("/users")
    public List<User> users() { return service.getUsers(); }

    @GetMapping("/users/{id}")
    public ResponseEntity<?> user(@PathVariable Long id) {
        return service.getUser(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/teams")
    public List<Team> teams() { return service.getTeams(); }

    @GetMapping("/teams/{id}")
    public ResponseEntity<?> team(@PathVariable Long id) {
        return service.getTeam(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/teams")
    public Team createTeam(@RequestBody Team team) { return service.createTeam(team); }

    @PostMapping("/teams/{teamId}/members/{userId}")
    public ResponseEntity<Void> addMember(@PathVariable Long teamId, @PathVariable Long userId) {
        service.addTeamMember(teamId, userId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/projects")
    public List<Project> projects() { return service.getProjects(); }

    @GetMapping("/projects/{id}")
    public ResponseEntity<?> project(@PathVariable Long id) {
        return service.getProject(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/teams/{teamId}/projects")
    public List<Project> projectsByTeam(@PathVariable Long teamId) { return service.getProjectsByTeam(teamId); }

    @PostMapping("/projects")
    public Project createProject(@RequestBody Project project, Authentication auth) {
        Long userId = auth != null ? (Long) auth.getPrincipal() : null;
        return service.createProject(project, userId);
    }

    @PutMapping("/projects/{id}")
    public Project updateProject(@PathVariable Long id, @RequestBody Project project, Authentication auth) {
        project.setId(id);
        Long userId = auth != null ? (Long) auth.getPrincipal() : null;
        return service.updateProject(project, userId);
    }

    @GetMapping("/projects/{projectId}/milestones")
    public List<Milestone> milestones(@PathVariable Long projectId) { return service.getMilestones(projectId); }

    @GetMapping("/milestones/{id}")
    public ResponseEntity<?> milestone(@PathVariable Long id) {
        return service.getMilestone(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/projects/{projectId}/milestones")
    public Milestone createMilestone(@PathVariable Long projectId,
                                     @RequestBody Map<String, Object> body,
                                     Authentication auth) {
        Milestone m = new Milestone();
        m.setName((String) body.get("name"));
        m.setDescription(body.containsKey("description") ? (String) body.get("description") : null);
        if (body.get("dueDate") != null && !((String) body.get("dueDate")).isEmpty())
            m.setDueDate(java.time.LocalDate.parse((String) body.get("dueDate")));
        Long userId = auth != null ? (Long) auth.getPrincipal() : null;
        Milestone created = service.createMilestone(projectId, m, userId);
        @SuppressWarnings("unchecked")
        List<Number> taskIds = (List<Number>) body.get("taskIds");
        if (taskIds != null && !taskIds.isEmpty()) {
            List<Long> ids = taskIds.stream().map(Number::longValue).collect(Collectors.toList());
            service.updateMilestone(projectId, created.getId(), created.getName(), created.getDescription(),
                    created.getDueDate(), ids, userId);
        }
        return service.getMilestone(created.getId()).orElse(created);
    }

    @PutMapping("/projects/{projectId}/milestones/{milestoneId}")
    public Milestone updateMilestone(@PathVariable Long projectId, @PathVariable Long milestoneId,
                                     @RequestBody Map<String, Object> body,
                                     Authentication auth) {
        String name = (String) body.get("name");
        String description = body.containsKey("description") ? (String) body.get("description") : null;
        java.time.LocalDate dueDate = null;
        if (body.get("dueDate") != null && !((String) body.get("dueDate")).isEmpty())
            dueDate = java.time.LocalDate.parse((String) body.get("dueDate"));
        @SuppressWarnings("unchecked")
        List<Number> taskIds = body.containsKey("taskIds") ? (List<Number>) body.get("taskIds") : null;
        List<Long> ids = taskIds != null ? taskIds.stream().map(Number::longValue).collect(Collectors.toList()) : null;
        Long userId = auth != null ? (Long) auth.getPrincipal() : null;
        return service.updateMilestone(projectId, milestoneId, name, description, dueDate, ids, userId);
    }

    @DeleteMapping("/projects/{projectId}/milestones/{milestoneId}")
    public ResponseEntity<Void> deleteMilestone(@PathVariable Long projectId,
                                                @PathVariable Long milestoneId,
                                                Authentication auth) {
        Long userId = auth != null ? (Long) auth.getPrincipal() : null;
        service.deleteMilestone(projectId, milestoneId, userId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/tasks")
    public List<Task> tasks() { return service.getTasks(); }

    @GetMapping("/tasks/{id}")
    public ResponseEntity<?> task(@PathVariable Long id) {
        return service.getTask(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/projects/{projectId}/tasks")
    public List<Task> tasksByProject(@PathVariable Long projectId) { return service.getTasksByProject(projectId); }

    @GetMapping("/users/{userId}/tasks")
    public List<Task> tasksByUser(@PathVariable Long userId) { return service.getTasksByAssignee(userId); }

    @PostMapping("/tasks")
    public Task createTask(@RequestBody Task task, Authentication auth) {
        Long userId = auth != null ? (Long) auth.getPrincipal() : null;
        return service.createTask(task, userId);
    }

    @PutMapping("/tasks/{id}")
    public Task updateTask(@PathVariable Long id, @RequestBody Task task, Authentication auth) {
        task.setId(id);
        Long userId = auth != null ? (Long) auth.getPrincipal() : null;
        return service.updateTask(task, userId);
    }

    @DeleteMapping("/tasks/{id}")
    public ResponseEntity<Void> deleteTask(@PathVariable Long id) {
        service.deleteTask(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/tasks/{taskId}/comments")
    public List<Comment> comments(@PathVariable Long taskId) { return service.getComments(taskId); }

    @GetMapping("/activities")
    public List<Notification> activities(@RequestParam(required = false) Integer limit) {
        return service.getActivities(limit);
    }

    @PostMapping("/activities")
    public Notification recordActivity(@RequestBody Map<String, String> body, Authentication auth) {
        Long userId = auth != null ? (Long) auth.getPrincipal() : null;
        return service.recordActivity(
                userId,
                body.get("type"),
                body.get("title"),
                body.get("message"),
                body.get("targetPath")
        );
    }

    @PostMapping("/tasks/{taskId}/comments")
    public Comment addComment(@PathVariable Long taskId, @RequestBody Map<String, String> body, Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        return service.createComment(taskId, userId, body.get("content"));
    }

    @DeleteMapping("/tasks/{taskId}/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(@PathVariable Long taskId,
                                              @PathVariable Long commentId,
                                              Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        service.deleteComment(taskId, commentId, userId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/reports/overdue-tasks")
    public List<Task> overdueTasks() { return service.getOverdueTasks(); }

    @GetMapping("/reports/projects/{projectId}/completed")
    public Map<String, Object> completedByProject(@PathVariable Long projectId) {
        return Map.of("projectId", projectId, "completedCount", service.getCompletedTasksByProject(projectId));
    }

    @GetMapping("/reports/users/{userId}/tasks")
    public List<Task> tasksPerUser(@PathVariable Long userId) { return service.getTasksByAssignee(userId); }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleError(IllegalArgumentException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<String> handleAccessDenied(AccessDeniedException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
    }
}
