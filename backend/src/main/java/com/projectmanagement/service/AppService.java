package com.projectmanagement.service;

import com.projectmanagement.model.*;
import com.projectmanagement.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
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
    private final NotificationRepository notificationRepo;
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
    public Milestone createMilestone(Long projectId, Milestone m, Long actorId) {
        m.setProject(projectRepo.findById(projectId).orElseThrow());
        Milestone created = milestoneRepo.save(m);
        createActivity(
                actorId,
                "milestone",
                "Milestone created",
                actorName(actorId) + " created milestone \"" + created.getName() + "\" in " + projectName(created.getProject()),
                projectPath(created.getProject())
        );
        return created;
    }
    public Milestone updateMilestone(Long projectId, Long milestoneId, String name, String description,
                                     LocalDate dueDate, List<Long> taskIds, Long actorId) {
        Milestone m = milestoneRepo.findById(milestoneId)
                .filter(mil -> mil.getProject() != null && mil.getProject().getId().equals(projectId))
                .orElseThrow(() -> new IllegalArgumentException("Milestone not found"));
        String previousName = m.getName();
        LocalDate previousDueDate = m.getDueDate();
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
        Milestone saved = milestoneRepo.save(m);
        String changeSummary = !Objects.equals(previousName, saved.getName())
                ? "renamed milestone to \"" + saved.getName() + "\""
                : !Objects.equals(previousDueDate, saved.getDueDate())
                    ? "updated milestone deadline for \"" + saved.getName() + "\""
                    : "updated milestone \"" + saved.getName() + "\"";
        createActivity(
                actorId,
                "milestone",
                "Milestone updated",
                actorName(actorId) + " " + changeSummary + " in " + projectName(saved.getProject()),
                projectPath(saved.getProject())
        );
        return saved;
    }
    public void deleteMilestone(Long projectId, Long milestoneId, Long actorId) {
        Milestone m = milestoneRepo.findById(milestoneId)
                .filter(mil -> mil.getProject() != null && mil.getProject().getId().equals(projectId))
                .orElseThrow(() -> new IllegalArgumentException("Milestone not found"));
        String milestoneName = m.getName();
        Project project = m.getProject();
        List<Task> assigned = taskRepo.findByMilestoneId(milestoneId);
        for (Task task : assigned) {
            task.setMilestone(null);
            taskRepo.save(task);
        }
        milestoneRepo.delete(m);
        createActivity(
                actorId,
                "milestone",
                "Milestone deleted",
                actorName(actorId) + " deleted milestone \"" + milestoneName + "\" from " + projectName(project),
                projectPath(project)
        );
    }

    // Tasks
    public List<Task> getTasks() { return taskRepo.findAll(); }
    public Optional<Task> getTask(Long id) { return taskRepo.findById(id); }
    public List<Task> getTasksByProject(Long projectId) { return taskRepo.findByProjectId(projectId); }
    public List<Task> getTasksByAssignee(Long userId) { return taskRepo.findByAssigneeId(userId); }
    public Task createTask(Task t, Long actorId) {
        Task task = new Task();
        applyTaskChanges(task, t);
        Task saved = taskRepo.save(task);
        updateMilestoneCompletion(saved.getMilestone());
        createActivity(
                actorId,
                "task",
                "Task created",
                actorName(actorId) + " created task \"" + saved.getTitle() + "\" in " + projectName(saved.getProject()),
                taskPath(saved)
        );
        return saved;
    }
    public Task updateTask(Task t, Long actorId) {
        Task existing = taskRepo.findById(t.getId())
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));
        Milestone previousMilestone = existing.getMilestone();
        Task.Status previousStatus = existing.getStatus();
        Task.Priority previousPriority = existing.getPriority();
        LocalDate previousDeadline = existing.getDeadline();
        Long previousAssigneeId = existing.getAssignee() != null ? existing.getAssignee().getId() : null;
        String previousTitle = existing.getTitle();
        applyTaskChanges(existing, t);
        Task saved = taskRepo.save(existing);
        updateMilestoneCompletion(previousMilestone);
        updateMilestoneCompletion(saved.getMilestone());
        createActivity(
                actorId,
                "task",
                "Task updated",
                describeTaskUpdate(saved, previousTitle, previousStatus, previousPriority, previousDeadline, previousAssigneeId, actorId),
                taskPath(saved)
        );
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
        Comment saved = commentRepo.save(c);
        createActivity(
                userId,
                "comment",
                "Comment added",
                actorName(userId) + " commented on \"" + saved.getTask().getTitle() + "\"",
                taskPath(saved.getTask())
        );
        return saved;
    }

    public List<Notification> getActivities(Integer limit) {
        List<Notification> activities = notificationRepo.findAllByOrderByCreatedAtDesc();
        if (limit == null || limit <= 0 || activities.size() <= limit) {
            return activities;
        }
        return new ArrayList<>(activities.subList(0, limit));
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

    private void createActivity(Long actorId, String type, String title, String message, String targetPath) {
        Notification notification = new Notification();
        notification.setType(type);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setTargetPath(targetPath);
        notification.setRead(false);
        if (actorId != null) {
            userRepo.findById(actorId).ifPresent(notification::setUser);
        }
        notificationRepo.save(notification);
    }

    private String describeTaskUpdate(Task task,
                                      String previousTitle,
                                      Task.Status previousStatus,
                                      Task.Priority previousPriority,
                                      LocalDate previousDeadline,
                                      Long previousAssigneeId,
                                      Long actorId) {
        String actor = actorName(actorId);
        String taskTitle = task.getTitle();
        if (!Objects.equals(previousStatus, task.getStatus())) {
            return actor + " moved \"" + taskTitle + "\" to " + formatLabel(task.getStatus().name());
        }
        Long currentAssigneeId = task.getAssignee() != null ? task.getAssignee().getId() : null;
        if (!Objects.equals(previousAssigneeId, currentAssigneeId)) {
            String assigneeName = task.getAssignee() != null ? task.getAssignee().getName() : "Unassigned";
            return actor + " reassigned \"" + taskTitle + "\" to " + assigneeName;
        }
        if (!Objects.equals(previousDeadline, task.getDeadline())) {
            return actor + " updated the deadline for \"" + taskTitle + "\"";
        }
        if (!Objects.equals(previousPriority, task.getPriority())) {
            return actor + " changed the priority for \"" + taskTitle + "\" to " + formatLabel(task.getPriority().name());
        }
        if (!Objects.equals(previousTitle, task.getTitle())) {
            return actor + " renamed task to \"" + task.getTitle() + "\"";
        }
        return actor + " updated task \"" + taskTitle + "\"";
    }

    private String actorName(Long actorId) {
        if (actorId == null) {
            return "System";
        }
        return userRepo.findById(actorId).map(User::getName).orElse("System");
    }

    private String projectName(Project project) {
        return project != null ? project.getName() : "Unknown project";
    }

    private String projectPath(Project project) {
        return project != null && project.getId() != null ? "/projects/" + project.getId() : "/projects";
    }

    private String taskPath(Task task) {
        if (task.getProject() != null && task.getProject().getId() != null) {
            return "/projects/" + task.getProject().getId();
        }
        return "/projects";
    }

    private String formatLabel(String value) {
        return value.toLowerCase().replace('_', ' ');
    }
}
