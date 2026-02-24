package com.stockguide.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stockguide.analysis.AnalysisResult;
import com.stockguide.analysis.StockAnalysisEngine;
import com.stockguide.cache.CacheService;
import com.stockguide.domain.entity.Stock;
import com.stockguide.domain.entity.StockAnalysis;
import com.stockguide.domain.entity.StockPrice;
import com.stockguide.repository.StockAnalysisRepository;
import com.stockguide.repository.StockPriceRepository;
import com.stockguide.repository.StockRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class StockAnalysisService {

    private final StockRepository stockRepository;
    private final StockPriceRepository stockPriceRepository;
    private final StockAnalysisRepository analysisRepository;
    private final StockAnalysisEngine analysisEngine;
    private final CacheService cacheService;
    private final ObjectMapper objectMapper;

    @Transactional
    public void analyzeAll() {
        List<Stock> stocks = stockRepository.findByIsActiveTrue();
        log.info("Analyzing {} stocks", stocks.size());
        stocks.forEach(this::analyzeStock);
    }

    @Transactional
    public StockAnalysis analyzeStock(Stock stock) {
        try {
            List<StockPrice> priceHistory = stockPriceRepository.findLatestByStock(stock, 30);

            AnalysisResult result = analysisEngine.analyze(priceHistory);
            String reasonsJson = objectMapper.writeValueAsString(result.getReasons());

            StockAnalysis analysis = StockAnalysis.builder()
                    .stock(stock)
                    .score(result.getScore())
                    .recommendation(result.getRecommendation())
                    .risk(result.getRisk())
                    .reasons(reasonsJson)
                    .currentPrice(result.getCurrentPrice())
                    .ma5(result.getMa5())
                    .ma20(result.getMa20())
                    .volumeRatio(result.getVolumeRatio())
                    .priceChangeRate(result.getPriceChangeRate())
                    .build();

            StockAnalysis saved = analysisRepository.save(analysis);

            // 캐시 무효화
            cacheService.evictAnalysisCache(stock.getSymbol());

            log.debug("Analysis for {}: score={}, recommendation={}",
                    stock.getSymbol(), result.getScore(), result.getRecommendation());

            return saved;
        } catch (Exception e) {
            log.error("Failed to analyze stock {}: {}", stock.getSymbol(), e.getMessage());
            return null;
        }
    }

    @Transactional
    public StockAnalysis analyzeBySymbol(String symbol) {
        Stock stock = stockRepository.findBySymbol(symbol.toUpperCase())
                .orElseThrow(() -> new IllegalArgumentException("종목을 찾을 수 없습니다: " + symbol));
        return analyzeStock(stock);
    }
}
