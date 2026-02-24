package com.stockguide.domain.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

public class AuthRequest {

    @Getter
    @Setter
    public static class SignUp {
        @NotBlank
        @Email
        private String email;

        @NotBlank
        @Size(min = 8, max = 100)
        private String password;

        @NotBlank
        @Size(min = 2, max = 20)
        private String nickname;
    }

    @Getter
    @Setter
    public static class SignIn {
        @NotBlank
        @Email
        private String email;

        @NotBlank
        private String password;
    }
}
