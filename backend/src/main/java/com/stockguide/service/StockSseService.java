package com.stockguide.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

import java.math.BigDecimal;

/**
 * KIS 실시간 체결 데이터를 프론트엔드로 SSE 브로드캐스트하는 서비스.
 * KisWebSocketService → StockSseService → GET /api/stocks/stream (EventSource)
 */
@Service
@Slf4j
public class StockSseService {

    public record PriceUpdate(
        String symbol,
        BigDecimal price,
        BigDecimal priceChangeRate,
        long volume
    ) {}

    /** multicast: 구독자 없을 때도 발행 가능, onBackpressureBuffer로 유실 방지 */
    private final Sinks.Many<PriceUpdate> sink =
        Sinks.many().multicast().onBackpressureBuffer(512, false);

    public void publish(String symbol, BigDecimal price, BigDecimal priceChangeRate, long volume) {
        Sinks.EmitResult result = sink.tryEmitNext(new PriceUpdate(symbol, price, priceChangeRate, volume));
        if (result.isFailure()) {
            log.debug("[SSE] publish 실패 {}: {}", symbol, result);
        }
    }

    /** SSE 구독용 Flux (각 구독자에게 독립적으로 이벤트 전달) */
    public Flux<PriceUpdate> flux() {
        return sink.asFlux();
    }
}
