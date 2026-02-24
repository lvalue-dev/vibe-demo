package com.stockguide.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stockguide.cache.CacheService;
import com.stockguide.domain.dto.AnalysisResponse;
import com.stockguide.domain.dto.StockDetailResponse;
import com.stockguide.domain.dto.StockListResponse;
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

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class StockService {

    private final StockRepository stockRepository;
    private final StockPriceRepository stockPriceRepository;
    private final StockAnalysisRepository analysisRepository;
    private final CacheService cacheService;
    private final ObjectMapper objectMapper;

    public List<StockListResponse> getAllStocks() {
        List<Stock> stocks = stockRepository.findByIsActiveTrue();
        return stocks.stream()
                .map(this::buildStockListResponse)
                .toList();
    }

    public StockDetailResponse getStockDetail(String symbol) {
        Stock stock = stockRepository.findBySymbol(symbol.toUpperCase())
                .orElseThrow(() -> new IllegalArgumentException("종목을 찾을 수 없습니다: " + symbol));

        StockPrice latestPrice = stockPriceRepository.findTopByStockOrderByTimestampDesc(stock)
                .orElse(null);

        StockAnalysis latestAnalysis = analysisRepository.findTopByStockOrderByCreatedAtDesc(stock)
                .orElse(null);

        List<StockPrice> chartPrices = stockPriceRepository.findByStockAndTimestampAfter(
                stock, LocalDateTime.now().minusDays(30));

        List<StockDetailResponse.PricePoint> chartData = buildChartData(chartPrices);

        return buildStockDetailResponse(stock, latestPrice, latestAnalysis, chartData);
    }

    public AnalysisResponse getAnalysis(String symbol) {
        Stock stock = stockRepository.findBySymbol(symbol.toUpperCase())
                .orElseThrow(() -> new IllegalArgumentException("종목을 찾을 수 없습니다: " + symbol));

        StockAnalysis analysis = analysisRepository.findTopByStockOrderByCreatedAtDesc(stock)
                .orElseThrow(() -> new IllegalStateException("분석 데이터가 없습니다: " + symbol));

        return mapToAnalysisResponse(analysis);
    }

    private StockListResponse buildStockListResponse(Stock stock) {
        StockPrice price = stockPriceRepository.findTopByStockOrderByTimestampDesc(stock).orElse(null);
        StockAnalysis analysis = analysisRepository.findTopByStockOrderByCreatedAtDesc(stock).orElse(null);

        BigDecimal currentPrice = price != null ? price.getPrice() : BigDecimal.ZERO;
        BigDecimal changeRate = (price != null && price.getPrevClose() != null && price.getPrevClose().compareTo(BigDecimal.ZERO) > 0)
                ? price.getPrice().subtract(price.getPrevClose()).divide(price.getPrevClose(), 4, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        return StockListResponse.builder()
                .symbol(stock.getSymbol())
                .name(stock.getName())
                .market(stock.getMarket())
                .currentPrice(currentPrice)
                .priceChangeRate(changeRate)
                .volume(price != null ? price.getVolume() : 0L)
                .recommendation(analysis != null ? analysis.getRecommendation() : null)
                .recommendationLabel(analysis != null ? analysis.getRecommendation().getDisplayName() : "분석 중")
                .score(analysis != null ? analysis.getScore() : null)
                .risk(analysis != null ? analysis.getRisk() : null)
                .riskLabel(analysis != null ? analysis.getRisk().getDisplayName() : "-")
                .analyzedAt(analysis != null ? analysis.getCreatedAt() : null)
                .build();
    }

    private StockDetailResponse buildStockDetailResponse(
            Stock stock, StockPrice price, StockAnalysis analysis,
            List<StockDetailResponse.PricePoint> chartData) {

        BigDecimal currentPrice = price != null ? price.getPrice() : BigDecimal.ZERO;
        BigDecimal changeRate = (price != null && price.getPrevClose() != null && price.getPrevClose().compareTo(BigDecimal.ZERO) > 0)
                ? price.getPrice().subtract(price.getPrevClose()).divide(price.getPrevClose(), 4, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        List<String> reasons = new ArrayList<>();
        if (analysis != null && analysis.getReasons() != null) {
            try {
                reasons = objectMapper.readValue(analysis.getReasons(), new TypeReference<>() {});
            } catch (Exception e) {
                reasons = List.of(analysis.getReasons());
            }
        }

        return StockDetailResponse.builder()
                .symbol(stock.getSymbol())
                .name(stock.getName())
                .market(stock.getMarket())
                .sector(stock.getSector())
                .currentPrice(currentPrice)
                .prevClose(price != null ? price.getPrevClose() : null)
                .priceChangeRate(changeRate)
                .volume(price != null ? price.getVolume() : 0L)
                .score(analysis != null ? analysis.getScore() : null)
                .recommendation(analysis != null ? analysis.getRecommendation() : null)
                .recommendationLabel(analysis != null ? analysis.getRecommendation().getDisplayName() : "분석 중")
                .risk(analysis != null ? analysis.getRisk() : null)
                .riskLabel(analysis != null ? analysis.getRisk().getDisplayName() : "-")
                .reasons(reasons)
                .ma5(analysis != null ? analysis.getMa5() : null)
                .ma20(analysis != null ? analysis.getMa20() : null)
                .volumeRatio(analysis != null ? analysis.getVolumeRatio() : null)
                .chartData(chartData)
                .analyzedAt(analysis != null ? analysis.getCreatedAt() : null)
                .build();
    }

    private AnalysisResponse mapToAnalysisResponse(StockAnalysis analysis) {
        List<String> reasons = new ArrayList<>();
        try {
            reasons = objectMapper.readValue(analysis.getReasons(), new TypeReference<>() {});
        } catch (Exception e) {
            reasons = List.of(Optional.ofNullable(analysis.getReasons()).orElse("분석 중"));
        }

        return AnalysisResponse.builder()
                .score(analysis.getScore())
                .recommendation(analysis.getRecommendation())
                .recommendationLabel(analysis.getRecommendation().getDisplayName())
                .risk(analysis.getRisk())
                .riskLabel(analysis.getRisk().getDisplayName())
                .reasons(reasons)
                .ma5(analysis.getMa5())
                .ma20(analysis.getMa20())
                .volumeRatio(analysis.getVolumeRatio())
                .priceChangeRate(analysis.getPriceChangeRate())
                .analyzedAt(analysis.getCreatedAt())
                .build();
    }

    private List<StockDetailResponse.PricePoint> buildChartData(List<StockPrice> prices) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MM-dd HH:mm");
        List<StockDetailResponse.PricePoint> points = new ArrayList<>();

        for (int i = 0; i < prices.size(); i++) {
            StockPrice p = prices.get(i);
            points.add(StockDetailResponse.PricePoint.builder()
                    .time(p.getTimestamp().format(formatter))
                    .price(p.getPrice())
                    .volume(p.getVolume())
                    .build());
        }
        return points;
    }
}
