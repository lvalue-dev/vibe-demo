package com.stockguide.cache;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class CacheService {

    private final RedisTemplate<String, Object> redisTemplate;

    private static final String PRICE_KEY = "stock:price:";
    private static final String ANALYSIS_KEY = "stock:analysis:";
    private static final Duration PRICE_TTL = Duration.ofMinutes(5);
    private static final Duration ANALYSIS_TTL = Duration.ofMinutes(15);

    public void cachePriceData(String symbol, Object data) {
        try {
            redisTemplate.opsForValue().set(PRICE_KEY + symbol, data, PRICE_TTL);
        } catch (Exception e) {
            log.warn("Redis cache write failed for price {}: {}", symbol, e.getMessage());
        }
    }

    public Optional<Object> getPriceData(String symbol) {
        try {
            return Optional.ofNullable(redisTemplate.opsForValue().get(PRICE_KEY + symbol));
        } catch (Exception e) {
            log.warn("Redis cache read failed for price {}: {}", symbol, e.getMessage());
            return Optional.empty();
        }
    }

    public void cacheAnalysisData(String symbol, Object data) {
        try {
            redisTemplate.opsForValue().set(ANALYSIS_KEY + symbol, data, ANALYSIS_TTL);
        } catch (Exception e) {
            log.warn("Redis cache write failed for analysis {}: {}", symbol, e.getMessage());
        }
    }

    public Optional<Object> getAnalysisData(String symbol) {
        try {
            return Optional.ofNullable(redisTemplate.opsForValue().get(ANALYSIS_KEY + symbol));
        } catch (Exception e) {
            log.warn("Redis cache read failed for analysis {}: {}", symbol, e.getMessage());
            return Optional.empty();
        }
    }

    public void evictAnalysisCache(String symbol) {
        try {
            redisTemplate.delete(ANALYSIS_KEY + symbol);
        } catch (Exception e) {
            log.warn("Redis evict failed for {}: {}", symbol, e.getMessage());
        }
    }
}
