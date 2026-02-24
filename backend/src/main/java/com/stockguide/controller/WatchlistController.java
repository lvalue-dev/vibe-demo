package com.stockguide.controller;

import com.stockguide.domain.dto.WatchlistResponse;
import com.stockguide.domain.entity.User;
import com.stockguide.repository.UserRepository;
import com.stockguide.service.WatchlistService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/watchlist")
@RequiredArgsConstructor
public class WatchlistController {

    private final WatchlistService watchlistService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<WatchlistResponse>> getWatchlist(Authentication auth) {
        User user = getUser(auth);
        return ResponseEntity.ok(watchlistService.getWatchlist(user));
    }

    @PostMapping
    public ResponseEntity<WatchlistResponse> addToWatchlist(
            Authentication auth,
            @RequestBody Map<String, String> body) {
        User user = getUser(auth);
        String symbol = body.get("symbol");
        return ResponseEntity.ok(watchlistService.addToWatchlist(user, symbol));
    }

    @DeleteMapping("/{symbol}")
    public ResponseEntity<Void> removeFromWatchlist(
            Authentication auth,
            @PathVariable String symbol) {
        User user = getUser(auth);
        watchlistService.removeFromWatchlist(user, symbol);
        return ResponseEntity.noContent().build();
    }

    private User getUser(Authentication auth) {
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new IllegalStateException("사용자를 찾을 수 없습니다."));
    }
}
