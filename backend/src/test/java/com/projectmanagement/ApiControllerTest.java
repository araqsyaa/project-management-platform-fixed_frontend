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

    private String bearer(String token) {
        return "Bearer " + token;
    }
}
