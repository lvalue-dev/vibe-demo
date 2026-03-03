package com.stockguide.collector;

import com.stockguide.domain.entity.Stock;
import com.stockguide.domain.entity.StockPrice;
import com.stockguide.kis.KisApiClient;
import com.stockguide.kis.KisProperties;
import com.stockguide.repository.StockPriceRepository;
import com.stockguide.repository.StockRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 주식 데이터 수집기
 *
 * KIS(한국투자증권) Open API를 사용해 가격 데이터를 수집합니다.
 * KIS_APP_KEY / KIS_APP_SECRET 환경변수가 설정된 경우에만 동작합니다.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class StockDataCollector {

    private final StockRepository stockRepository;
    private final StockPriceRepository stockPriceRepository;
    private final KisApiClient kisApiClient;
    private final KisProperties kisProperties;

    @Value("${stock.collector.enabled:true}")
    private boolean collectorEnabled;

    public void collectAll() {
        if (!collectorEnabled) {
            log.debug("Stock collector disabled");
            return;
        }

        if (!kisProperties.isConfigured()) {
            log.warn("KIS API not configured (KIS_APP_KEY/KIS_APP_SECRET missing) - skipping collection");
            return;
        }

        List<Stock> activeStocks = stockRepository.findByIsActiveTrue();
        log.info("Collecting data for {} stocks via KIS API", activeStocks.size());

        activeStocks.forEach(this::collectStock);
    }

    public void collectStock(Stock stock) {
        try {
            KisApiClient.KisPrice price = kisApiClient.fetchPrice(stock.getSymbol());
            if (price == null || price.price() == null) {
                log.debug("No price data for {}", stock.getSymbol());
                return;
            }

            StockPrice entity = StockPrice.builder()
                .stock(stock)
                .price(price.price())
                .openPrice(price.openPrice())
                .highPrice(price.highPrice())
                .lowPrice(price.lowPrice())
                .prevClose(price.prevClose())
                .volume(price.volume())
                .timestamp(LocalDateTime.now())
                .build();

            stockPriceRepository.save(entity);
            log.debug("Collected price for {}: {}", stock.getSymbol(), price.price());
        } catch (Exception e) {
            log.error("Failed to collect data for {}: {}", stock.getSymbol(), e.getMessage());
        }
    }
}
