package com.projectmanagement.service;

import com.projectmanagement.model.*;
import com.projectmanagement.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
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
    public void deleteMilestone(Long projectId, Long milestoneId) {
        Milestone m = milestoneRepo.findById(milestoneId)
                .filter(mil -> mil.getProject() != null && mil.getProject().getId().equals(projectId))
                .orElseThrow(() -> new IllegalArgumentException("Milestone not found"));
        List<Task> assigned = taskRepo.findByMilestoneId(milestoneId);
        for (Task task : assigned) {
            task.setMilestone(null);
            taskRepo.save(task);
        }
        milestoneRepo.delete(m);
    }

    // Tasks
    public List<Task> getTasks() { return taskRepo.findAll(); }
    public Optional<Task> getTask(Long id) { return taskRepo.findById(id); }
    public List<Task> getTasksByProject(Long projectId) { return taskRepo.findByProjectId(projectId); }
    public List<Task> getTasksByAssignee(Long userId) { return taskRepo.findByAssigneeId(userId); }
    public Task createTask(Task t) {
        Task task = new Task();
        applyTaskChanges(task, t);
        Task saved = taskRepo.save(task);
        updateMilestoneCompletion(saved.getMilestone());
        return saved;
    }
    public Task updateTask(Task t) {
        Task existing = taskRepo.findById(t.getId())
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));
        Milestone previousMilestone = existing.getMilestone();
        applyTaskChanges(existing, t);
        Task saved = taskRepo.save(existing);
        updateMilestoneCompletion(previousMilestone);
        updateMilestoneCompletion(saved.getMilestone());
        return saved;
    }
    public void deleteTask(Long id) {
        Task existing = taskRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));
        Milestone milestone = existing.getMilestone();
        taskRepo.delete(existing);
        updateMilestoneCompletion(milestone);
    }
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

    public void deleteComment(Long taskId, Long commentId, Long userId) {
        Comment comment = commentRepo.findById(commentId)
                .filter(existing -> existing.getTask() != null && existing.getTask().getId().equals(taskId))
                .orElseThrow(() -> new IllegalArgumentException("Comment not found"));
        if (comment.getUser() == null || !comment.getUser().getId().equals(userId)) {
            throw new AccessDeniedException("You can delete only your own comments");
        }
        commentRepo.delete(comment);
    }

    private void applyTaskChanges(Task target, Task source) {
        target.setTitle(source.getTitle());
        target.setDescription(source.getDescription());
        target.setStatus(source.getStatus() != null ? source.getStatus() : Task.Status.BACKLOG);
        target.setPriority(source.getPriority() != null ? source.getPriority() : Task.Priority.MEDIUM);
        target.setDeadline(source.getDeadline());

        if (source.getProject() == null || source.getProject().getId() == null) {
            throw new IllegalArgumentException("Task project is required");
        }
        target.setProject(projectRepo.findById(source.getProject().getId())
                .orElseThrow(() -> new IllegalArgumentException("Project not found")));

        if (source.getAssignee() != null && source.getAssignee().getId() != null) {
            target.setAssignee(userRepo.findById(source.getAssignee().getId())
                    .orElseThrow(() -> new IllegalArgumentException("Assignee not found")));
        } else {
            target.setAssignee(null);
        }

        if (source.getMilestone() != null && source.getMilestone().getId() != null) {
            Milestone milestone = milestoneRepo.findById(source.getMilestone().getId())
                    .orElseThrow(() -> new IllegalArgumentException("Milestone not found"));
            if (milestone.getProject() == null || !milestone.getProject().getId().equals(target.getProject().getId())) {
                throw new IllegalArgumentException("Milestone does not belong to the task project");
            }
            target.setMilestone(milestone);
        } else if (target.getId() == null) {
            target.setMilestone(null);
        }
    }

    private void updateMilestoneCompletion(Milestone milestone) {
        if (milestone == null || milestone.getId() == null) {
            return;
        }

        Milestone managedMilestone = milestoneRepo.findById(milestone.getId()).orElse(null);
        if (managedMilestone == null) {
            return;
        }

        List<Task> assignedTasks = taskRepo.findByMilestoneId(managedMilestone.getId());
        managedMilestone.setCompleted(!assignedTasks.isEmpty() &&
                assignedTasks.stream().allMatch(task -> task.getStatus() == Task.Status.DONE));
        milestoneRepo.save(managedMilestone);
    }
}
