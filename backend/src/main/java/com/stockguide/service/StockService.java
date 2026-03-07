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
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

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

    public StockDetailResponse getStockDetail(String symbol, String period) {
        Stock stock = stockRepository.findBySymbol(symbol.toUpperCase())
                .orElseThrow(() -> new IllegalArgumentException("종목을 찾을 수 없습니다: " + symbol));

        StockPrice latestPrice = stockPriceRepository.findTopByStockOrderByTimestampDesc(stock)
                .orElse(null);

        StockAnalysis latestAnalysis = analysisRepository.findTopByStockOrderByCreatedAtDesc(stock)
                .orElse(null);

        LocalDateTime since = switch (period) {
            case "weekly"   -> LocalDateTime.now().minusDays(365);
            case "intraday" -> LocalDateTime.now().minusDays(3);
            default         -> LocalDateTime.now().minusDays(90);
        };
        List<StockPrice> prices = stockPriceRepository.findByStockAndTimestampAfter(stock, since);

        List<StockDetailResponse.PricePoint> chartData = switch (period) {
            case "intraday" -> buildIntradayChartData(prices);
            case "weekly"   -> buildWeeklyChartData(prices);
            default         -> buildDailyChartData(prices);
        };

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

    /** 일봉: 날짜별 마지막 가격 + 롤링 MA5/MA20 */
    private List<StockDetailResponse.PricePoint> buildDailyChartData(List<StockPrice> prices) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MM-dd");

        Map<LocalDate, StockPrice> dailyMap = new LinkedHashMap<>();
        for (StockPrice p : prices) {
            dailyMap.put(p.getTimestamp().toLocalDate(), p);
        }
        List<Map.Entry<LocalDate, StockPrice>> sorted = new ArrayList<>(dailyMap.entrySet());
        sorted.sort(Map.Entry.comparingByKey());

        List<BigDecimal> closes = sorted.stream().map(e -> e.getValue().getPrice()).collect(Collectors.toList());

        List<StockDetailResponse.PricePoint> points = new ArrayList<>();
        for (int i = 0; i < sorted.size(); i++) {
            StockPrice p = sorted.get(i).getValue();
            points.add(StockDetailResponse.PricePoint.builder()
                    .time(p.getTimestamp().format(fmt))
                    .price(p.getPrice())
                    .ma5(i  >= 4  ? rollingAvg(closes, i, 5)  : null)
                    .ma20(i >= 19 ? rollingAvg(closes, i, 20) : null)
                    .volume(p.getVolume())
                    .build());
        }
        return points;
    }

    /** 주봉: 주별 마지막 가격 + 롤링 MA5/MA20 (5주/20주) */
    private List<StockDetailResponse.PricePoint> buildWeeklyChartData(List<StockPrice> prices) {
        DateTimeFormatter labelFmt = DateTimeFormatter.ofPattern("MM/dd");
        DateTimeFormatter keyFmt   = DateTimeFormatter.ofPattern("yyyyMMdd");

        Map<String, StockPrice> weeklyMap = new LinkedHashMap<>();
        for (StockPrice p : prices) {
            String weekKey = p.getTimestamp().toLocalDate().with(DayOfWeek.MONDAY).format(keyFmt);
            weeklyMap.put(weekKey, p);
        }
        List<Map.Entry<String, StockPrice>> sorted = new ArrayList<>(weeklyMap.entrySet());
        sorted.sort(Map.Entry.comparingByKey());

        List<BigDecimal> closes = sorted.stream().map(e -> e.getValue().getPrice()).collect(Collectors.toList());

        List<StockDetailResponse.PricePoint> points = new ArrayList<>();
        for (int i = 0; i < sorted.size(); i++) {
            StockPrice p = sorted.get(i).getValue();
            LocalDate monday = p.getTimestamp().toLocalDate().with(DayOfWeek.MONDAY);
            points.add(StockDetailResponse.PricePoint.builder()
                    .time(monday.format(labelFmt))
                    .price(p.getPrice())
                    .ma5(i  >= 4  ? rollingAvg(closes, i, 5)  : null)
                    .ma20(i >= 19 ? rollingAvg(closes, i, 20) : null)
                    .volume(p.getVolume())
                    .build());
        }
        return points;
    }

    /** 분봉: 가장 최근 거래일 데이터만 HH:mm 포맷 */
    private List<StockDetailResponse.PricePoint> buildIntradayChartData(List<StockPrice> prices) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("HH:mm");

        Optional<LocalDate> latestDate = prices.stream()
                .map(p -> p.getTimestamp().toLocalDate())
                .max(Comparator.naturalOrder());
        if (latestDate.isEmpty()) return List.of();

        return prices.stream()
                .filter(p -> p.getTimestamp().toLocalDate().equals(latestDate.get()))
                .sorted(Comparator.comparing(StockPrice::getTimestamp))
                .map(p -> StockDetailResponse.PricePoint.builder()
                        .time(p.getTimestamp().format(fmt))
                        .price(p.getPrice())
                        .volume(p.getVolume())
                        .build())
                .collect(Collectors.toList());
    }

    private BigDecimal rollingAvg(List<BigDecimal> closes, int endIdx, int window) {
        List<BigDecimal> slice = closes.subList(endIdx - window + 1, endIdx + 1);
        return slice.stream()
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(slice.size()), 2, RoundingMode.HALF_UP);
    }
}

