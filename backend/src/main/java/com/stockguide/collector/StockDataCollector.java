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

import java.time.LocalDate;
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

    /** 전체 종목 30일치 일봉 데이터 백필 */
    public void backfillAll() {
        if (!kisProperties.isConfigured()) {
            log.warn("KIS API not configured - skipping backfill");
            return;
        }
        List<Stock> activeStocks = stockRepository.findByIsActiveTrue();
        log.info("Backfilling 30-day history for {} stocks", activeStocks.size());
        activeStocks.forEach(this::backfillStock);
    }

    public void backfillStock(Stock stock) {
        try {
            // 이미 데이터가 충분하면 건너뜀 (2개 이상이면 백필 불필요)
            long existingCount = stockPriceRepository.countByStock(stock);
            if (existingCount >= 2) {
                log.debug("Skipping backfill for {} ({} records exist)", stock.getSymbol(), existingCount);
                return;
            }

            List<KisApiClient.KisDailyPrice> history = kisApiClient.fetchDailyHistory(stock.getSymbol(), 30);
            if (history.isEmpty()) {
                log.debug("No history data for {}", stock.getSymbol());
                return;
            }

            for (KisApiClient.KisDailyPrice daily : history) {
                LocalDateTime ts = daily.date().atTime(16, 0); // 장 마감 시간으로 저장
                // 중복 방지: 같은 날짜 데이터가 이미 있으면 건너뜀
                if (stockPriceRepository.existsByStockAndTimestamp(stock, ts)) continue;

                StockPrice entity = StockPrice.builder()
                    .stock(stock)
                    .price(daily.closePrice())
                    .openPrice(daily.openPrice())
                    .highPrice(daily.highPrice())
                    .lowPrice(daily.lowPrice())
                    .prevClose(daily.closePrice()) // 일봉에서 prevClose는 closePrice로 대체
                    .volume(daily.volume())
                    .timestamp(ts)
                    .build();
                stockPriceRepository.save(entity);
            }
            log.info("Backfilled {} days for {}", history.size(), stock.getSymbol());
        } catch (Exception e) {
            log.error("Backfill failed for {}: {}", stock.getSymbol(), e.getMessage());
        }
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
