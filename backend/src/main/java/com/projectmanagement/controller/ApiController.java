package com.projectmanagement.controller;

import com.projectmanagement.model.*;
import com.projectmanagement.service.AppService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

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
    public Project createProject(@RequestBody Project project) { return service.createProject(project); }

    @PutMapping("/projects/{id}")
    public Project updateProject(@PathVariable Long id, @RequestBody Project project) {
        project.setId(id);
        return service.updateProject(project);
    }

    @GetMapping("/projects/{projectId}/milestones")
    public List<Milestone> milestones(@PathVariable Long projectId) { return service.getMilestones(projectId); }

    @PostMapping("/projects/{projectId}/milestones")
    public Milestone createMilestone(@PathVariable Long projectId, @RequestBody Milestone milestone) {
        return service.createMilestone(projectId, milestone);
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
    public Task createTask(@RequestBody Task task) { return service.createTask(task); }

    @PutMapping("/tasks/{id}")
    public Task updateTask(@PathVariable Long id, @RequestBody Task task) {
        task.setId(id);
        return service.updateTask(task);
    }

    @GetMapping("/tasks/{taskId}/comments")
    public List<Comment> comments(@PathVariable Long taskId) { return service.getComments(taskId); }

    @PostMapping("/tasks/{taskId}/comments")
    public Comment addComment(@PathVariable Long taskId, @RequestBody Map<String, String> body, Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        return service.createComment(taskId, userId, body.get("content"));
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
}
