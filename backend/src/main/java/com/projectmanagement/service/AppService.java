package com.projectmanagement.service;

import com.projectmanagement.model.*;
import com.projectmanagement.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AppService {

    private final UserRepository userRepo;
    private final TeamRepository teamRepo;
    private final ProjectRepository projectRepo;
    private final MilestoneRepository milestoneRepo;
    private final TaskRepository taskRepo;
    private final CommentRepository commentRepo;
    private final PasswordEncoder passwordEncoder;
    private final Map<String, Long> tokenStore;

    // Auth
    public Map<String, Object> register(Map<String, String> body) {
        if (userRepo.existsByEmail(body.get("email")))
            throw new IllegalArgumentException("Email already exists");
        User u = new User();
        u.setName(body.get("name"));
        u.setEmail(body.get("email"));
        u.setPassword(passwordEncoder.encode(body.get("password")));
        u.setRole(body.containsKey("role") ? User.Role.valueOf(body.get("role")) : User.Role.TEAM_MEMBER);
        u = userRepo.save(u);
        String token = UUID.randomUUID().toString();
        tokenStore.put(token, u.getId());
        return Map.of("user", u, "token", token);
    }

    public Map<String, Object> login(Map<String, String> body) {
        User u = userRepo.findByEmail(body.get("email"))
                .filter(x -> passwordEncoder.matches(body.get("password"), x.getPassword()))
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));
        String token = UUID.randomUUID().toString();
        tokenStore.put(token, u.getId());
        return Map.of("user", u, "token", token);
    }

    public void logout(String token) {
        tokenStore.remove(token);
    }

    // Users
    public List<User> getUsers() { return userRepo.findAll(); }
    public Optional<User> getUser(Long id) { return userRepo.findById(id); }

    // Teams
    public List<Team> getTeams() { return teamRepo.findAll(); }
    public Optional<Team> getTeam(Long id) { return teamRepo.findById(id); }
    public Team createTeam(Team t) { return teamRepo.save(t); }
    public void addTeamMember(Long teamId, Long userId) {
        Team team = teamRepo.findById(teamId).orElseThrow();
        User user = userRepo.findById(userId).orElseThrow();
        team.getMembers().add(user);
        user.getTeams().add(team);
        teamRepo.save(team);
        userRepo.save(user);
    }

    // Projects
    public List<Project> getProjects() { return projectRepo.findAll(); }
    public Optional<Project> getProject(Long id) { return projectRepo.findById(id); }
    public List<Project> getProjectsByTeam(Long teamId) { return projectRepo.findByTeamId(teamId); }
    public Project createProject(Project p) { return projectRepo.save(p); }
    public Project updateProject(Project p) { return projectRepo.save(p); }

    // Milestones
    public List<Milestone> getMilestones(Long projectId) { return milestoneRepo.findByProjectId(projectId); }
    public Optional<Milestone> getMilestone(Long id) { return milestoneRepo.findById(id); }
    public Milestone createMilestone(Long projectId, Milestone m) {
        m.setProject(projectRepo.findById(projectId).orElseThrow());
        return milestoneRepo.save(m);
    }
    public Milestone updateMilestone(Long projectId, Long milestoneId, String name, String description,
                                     LocalDate dueDate, List<Long> taskIds) {
        Milestone m = milestoneRepo.findById(milestoneId)
                .filter(mil -> mil.getProject() != null && mil.getProject().getId().equals(projectId))
                .orElseThrow(() -> new IllegalArgumentException("Milestone not found"));
        m.setName(name);
        m.setDescription(description);
        m.setDueDate(dueDate);
        List<Task> projectTasks = taskRepo.findByProjectId(projectId);
        for (Task t : projectTasks) {
            if (taskIds != null && taskIds.contains(t.getId())) {
                t.setMilestone(m);
                taskRepo.save(t);
            } else if (m.equals(t.getMilestone())) {
                t.setMilestone(null);
                taskRepo.save(t);
            }
        }
        List<Task> assigned = taskRepo.findByMilestoneId(milestoneId);
        m.setCompleted(assigned.stream().allMatch(t -> t.getStatus() == Task.Status.DONE));
        return milestoneRepo.save(m);
    }

    // Tasks
    public List<Task> getTasks() { return taskRepo.findAll(); }
    public Optional<Task> getTask(Long id) { return taskRepo.findById(id); }
    public List<Task> getTasksByProject(Long projectId) { return taskRepo.findByProjectId(projectId); }
    public List<Task> getTasksByAssignee(Long userId) { return taskRepo.findByAssigneeId(userId); }
    public Task createTask(Task t) { return taskRepo.save(t); }
    public Task updateTask(Task t) {
        Task saved = taskRepo.save(t);
        if (saved.getMilestone() != null) {
            Milestone m = saved.getMilestone();
            boolean allDone = taskRepo.findByMilestoneId(m.getId()).stream()
                    .allMatch(task -> task.getStatus() == Task.Status.DONE);
            m.setCompleted(allDone);
            milestoneRepo.save(m);
        }
        return saved;
    }
    public void deleteTask(Long id) { taskRepo.deleteById(id); }
    public List<Task> getOverdueTasks() {
        return taskRepo.findByDeadlineBeforeAndStatusNot(LocalDate.now(), Task.Status.DONE);
    }
    public long getCompletedTasksByProject(Long projectId) {
        return taskRepo.findByProjectIdAndStatus(projectId, Task.Status.DONE).size();
    }

    // Comments
    public List<Comment> getComments(Long taskId) { return commentRepo.findByTaskIdOrderByCreatedAtAsc(taskId); }
    public Comment createComment(Long taskId, Long userId, String content) {
        Comment c = new Comment();
        c.setContent(content);
        c.setTask(taskRepo.findById(taskId).orElseThrow());
        c.setUser(userRepo.findById(userId).orElseThrow());
        return commentRepo.save(c);
    }
}
