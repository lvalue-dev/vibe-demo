package com.stockguide.scheduler;

import com.stockguide.collector.StockDataCollector;
import com.stockguide.service.StockAnalysisService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "stock.collector.enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
public class StockScheduler {

    private final StockDataCollector collector;
    private final StockAnalysisService analysisService;

    /**
     * 5분마다 가격 수집 (평일 9시~16시)
     */
    @Scheduled(cron = "${stock.collector.cron:0 */5 9-16 * * MON-FRI}")
    public void collectAndAnalyze() {
        log.info("=== Stock collection & analysis started ===");
        try {
            collector.collectAll();
            analysisService.analyzeAll();
            log.info("=== Stock collection & analysis completed ===");
        } catch (Exception e) {
            log.error("Error in scheduled job: {}", e.getMessage(), e);
        }
    }
}
