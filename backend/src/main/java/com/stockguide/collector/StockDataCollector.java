package com.stockguide.collector;

import com.stockguide.domain.entity.Stock;
import com.stockguide.domain.entity.StockPrice;
import com.stockguide.repository.StockPriceRepository;
import com.stockguide.repository.StockRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 주식 데이터 수집기
 *
 * Yahoo Finance API (무료)를 사용해 가격 데이터를 수집합니다.
 * 실제 운영 시 KIS(한국투자증권) Open API 또는 Alpha Vantage로 교체 가능합니다.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class StockDataCollector {

    private final StockRepository stockRepository;
    private final StockPriceRepository stockPriceRepository;
    private final WebClient webClient;

    @Value("${stock.collector.enabled:true}")
    private boolean collectorEnabled;

    public void collectAll() {
        if (!collectorEnabled) {
            log.debug("Stock collector disabled");
            return;
        }

        List<Stock> activeStocks = stockRepository.findByIsActiveTrue();
        log.info("Collecting data for {} stocks", activeStocks.size());

        activeStocks.forEach(this::collectStock);
    }

    public void collectStock(Stock stock) {
        try {
            StockPrice price = fetchPrice(stock);
            if (price != null) {
                stockPriceRepository.save(price);
                log.debug("Collected price for {}: {}", stock.getSymbol(), price.getPrice());
            }
        } catch (Exception e) {
            log.error("Failed to collect data for {}: {}", stock.getSymbol(), e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private StockPrice fetchPrice(Stock stock) {
        try {
            String url = "https://query1.finance.yahoo.com/v8/finance/chart/" + stock.getSymbol()
                    + "?interval=5m&range=1d";

            Map<String, Object> response = webClient.get()
                    .uri(url)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .onErrorResume(e -> {
                        log.warn("Yahoo Finance API error for {}: {}", stock.getSymbol(), e.getMessage());
                        return Mono.empty();
                    })
                    .block();

            if (response == null) return null;

            Map<String, Object> chart = (Map<String, Object>) response.get("chart");
            Map<String, Object> result = extractResult(chart);
            if (result == null) return null;

            Map<String, Object> meta = (Map<String, Object>) result.get("meta");
            Map<String, Object> indicators = (Map<String, Object>) result.get("indicators");

            BigDecimal currentPrice = extractDecimal(meta, "regularMarketPrice");
            BigDecimal prevClose = extractDecimal(meta, "chartPreviousClose");
            Long volume = extractLong(meta, "regularMarketVolume");

            List<Map<String, Object>> quoteList = (List<Map<String, Object>>) indicators.get("quote");
            BigDecimal openPrice = null, highPrice = null, lowPrice = null;

            if (quoteList != null && !quoteList.isEmpty()) {
                Map<String, Object> quote = quoteList.get(0);
                openPrice = extractLastDecimal(quote, "open");
                highPrice = extractLastDecimal(quote, "high");
                lowPrice = extractLastDecimal(quote, "low");
            }

            if (currentPrice == null) return null;

            return StockPrice.builder()
                    .stock(stock)
                    .price(currentPrice)
                    .openPrice(openPrice)
                    .highPrice(highPrice)
                    .lowPrice(lowPrice)
                    .prevClose(prevClose)
                    .volume(volume != null ? volume : 0L)
                    .timestamp(LocalDateTime.now())
                    .build();

        } catch (Exception e) {
            log.error("Error parsing data for {}: {}", stock.getSymbol(), e.getMessage());
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> extractResult(Map<String, Object> chart) {
        if (chart == null) return null;
        List<Object> results = (List<Object>) chart.get("result");
        if (results == null || results.isEmpty()) return null;
        return (Map<String, Object>) results.get(0);
    }

    private BigDecimal extractDecimal(Map<String, Object> map, String key) {
        if (map == null) return null;
        Object val = map.get(key);
        if (val == null) return null;
        try {
            return new BigDecimal(val.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private BigDecimal extractLastDecimal(Map<String, Object> map, String key) {
        if (map == null) return null;
        List<Object> list = (List<Object>) map.get(key);
        if (list == null || list.isEmpty()) return null;
        // Find the last non-null value
        for (int i = list.size() - 1; i >= 0; i--) {
            Object val = list.get(i);
            if (val != null) {
                try {
                    return new BigDecimal(val.toString());
                } catch (NumberFormatException e) {
                    return null;
                }
            }
        }
        return null;
    }

    private Long extractLong(Map<String, Object> map, String key) {
        if (map == null) return null;
        Object val = map.get(key);
        if (val == null) return null;
        try {
            return Long.parseLong(val.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
