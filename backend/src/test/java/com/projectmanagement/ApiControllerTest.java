package com.projectmanagement;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ApiControllerTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void registerAndLogin() throws Exception {
        String body = "{\"name\":\"Test\",\"email\":\"test@x.com\",\"password\":\"pass1234\"}";
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user").exists())
                .andExpect(jsonPath("$.token").exists());

        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"test@x.com\",\"password\":\"pass1234\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists());
    }

    @Test
    void taskCommentsCanBeCreatedLoadedAndDeletedByAuthorOnly() throws Exception {
        String authorToken = registerAndGetToken("Comment Author", "author@x.com");
        String otherToken = registerAndGetToken("Other User", "other@x.com");

        Long projectId = extractId(
                mvc.perform(post("/api/projects")
                                .header("Authorization", bearer(authorToken))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"name\":\"Comment Project\"}"))
                        .andExpect(status().isOk())
                        .andReturn()
        );

        Long taskId = extractId(
                mvc.perform(post("/api/tasks")
                                .header("Authorization", bearer(authorToken))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"title\":\"Discuss API\",\"project\":{\"id\":" + projectId + "}}"))
                        .andExpect(status().isOk())
                        .andReturn()
        );

        MvcResult commentResult = mvc.perform(post("/api/tasks/" + taskId + "/comments")
                        .header("Authorization", bearer(authorToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"First comment\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("First comment"))
                .andExpect(jsonPath("$.user.name").value("Comment Author"))
                .andReturn();

        Long commentId = extractId(commentResult);

        mvc.perform(get("/api/tasks/" + taskId + "/comments")
                        .header("Authorization", bearer(authorToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(commentId))
                .andExpect(jsonPath("$[0].user.name").value("Comment Author"));

        mvc.perform(delete("/api/tasks/" + taskId + "/comments/" + commentId)
                        .header("Authorization", bearer(otherToken)))
                .andExpect(status().isForbidden())
                .andExpect(content().string("You can delete only your own comments"));

        mvc.perform(delete("/api/tasks/" + taskId + "/comments/" + commentId)
                        .header("Authorization", bearer(authorToken)))
                .andExpect(status().isOk());

        mvc.perform(get("/api/tasks/" + taskId + "/comments")
                        .header("Authorization", bearer(authorToken)))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));
    }

    @Test
    void taskUpdatesPersistAcrossFreshFetches() throws Exception {
        String managerToken = registerAndGetToken("Manager", "manager@x.com");

        Long assigneeId = extractId(
                mvc.perform(post("/api/auth/register")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"name\":\"Assignee\",\"email\":\"assignee@x.com\",\"password\":\"pass1234\"}"))
                        .andExpect(status().isOk())
                        .andReturn(),
                "/user/id"
        );

        Long projectId = extractId(
                mvc.perform(post("/api/projects")
                                .header("Authorization", bearer(managerToken))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"name\":\"Persistence Project\"}"))
                        .andExpect(status().isOk())
                        .andReturn()
        );

        Long taskId = extractId(
                mvc.perform(post("/api/tasks")
                                .header("Authorization", bearer(managerToken))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"title\":\"Initial Task\",\"status\":\"BACKLOG\",\"priority\":\"MEDIUM\",\"project\":{\"id\":" + projectId + "}}"))
                        .andExpect(status().isOk())
                        .andReturn()
        );

        String updateBody = """
                {
                  "title": "Initial Task",
                  "description": "Updated description",
                  "status": "IN_PROGRESS",
                  "priority": "HIGH",
                  "deadline": "2026-05-10",
                  "project": { "id": %d },
                  "assignee": { "id": %d }
                }
                """.formatted(projectId, assigneeId);

        mvc.perform(put("/api/tasks/" + taskId)
                        .header("Authorization", bearer(managerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignee.id").value(assigneeId))
                .andExpect(jsonPath("$.deadline").value("2026-05-10"))
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.priority").value("HIGH"));

        mvc.perform(get("/api/tasks/" + taskId)
                        .header("Authorization", bearer(managerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignee.id").value(assigneeId))
                .andExpect(jsonPath("$.deadline").value("2026-05-10"))
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.project.id").value(projectId));

        mvc.perform(get("/api/tasks")
                        .header("Authorization", bearer(managerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(taskId))
                .andExpect(jsonPath("$[0].assignee.id").value(assigneeId))
                .andExpect(jsonPath("$[0].deadline").value("2026-05-10"));
    }

    private String registerAndGetToken(String name, String email) throws Exception {
        MvcResult result = mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + name + "\",\"email\":\"" + email + "\",\"password\":\"pass1234\"}"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        return body.get("token").asText();
    }

    private Long extractId(MvcResult result) throws Exception {
        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        return body.get("id").asLong();
    }

    private Long extractId(MvcResult result, String path) throws Exception {
        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        JsonNode node = body.at(path);
        if (node.isMissingNode()) {
            throw new IllegalArgumentException("Missing path: " + path);
        }
        return node.asLong();
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }
}
