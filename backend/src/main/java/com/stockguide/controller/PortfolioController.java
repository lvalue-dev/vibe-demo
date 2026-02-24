package com.stockguide.controller;

import com.stockguide.domain.dto.PortfolioRequest;
import com.stockguide.domain.dto.PortfolioResponse;
import com.stockguide.domain.entity.User;
import com.stockguide.repository.UserRepository;
import com.stockguide.service.PortfolioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/portfolio")
@RequiredArgsConstructor
public class PortfolioController {

    private final PortfolioService portfolioService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<PortfolioResponse>> getPortfolio(Authentication auth) {
        User user = getUser(auth);
        return ResponseEntity.ok(portfolioService.getPortfolio(user));
    }

    @PostMapping
    public ResponseEntity<PortfolioResponse> addOrUpdate(
            Authentication auth,
            @Valid @RequestBody PortfolioRequest request) {
        User user = getUser(auth);
        return ResponseEntity.ok(portfolioService.addOrUpdatePortfolio(user, request));
    }

    @DeleteMapping("/{symbol}")
    public ResponseEntity<Void> remove(Authentication auth, @PathVariable String symbol) {
        User user = getUser(auth);
        portfolioService.removeFromPortfolio(user, symbol);
        return ResponseEntity.noContent().build();
    }

    private User getUser(Authentication auth) {
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new IllegalStateException("사용자를 찾을 수 없습니다."));
    }
}
