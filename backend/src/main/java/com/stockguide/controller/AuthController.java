package com.stockguide.controller;

import com.stockguide.domain.dto.AuthRequest;
import com.stockguide.domain.dto.AuthResponse;
import com.stockguide.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> signUp(@Valid @RequestBody AuthRequest.SignUp request) {
        return ResponseEntity.ok(authService.signUp(request));
    }

    @PostMapping("/signin")
    public ResponseEntity<AuthResponse> signIn(@Valid @RequestBody AuthRequest.SignIn request) {
        return ResponseEntity.ok(authService.signIn(request));
    }
}
