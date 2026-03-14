package com.stockguide.controller;

import com.stockguide.domain.dto.AnalysisResponse;
import com.stockguide.domain.dto.StockDetailResponse;
import com.stockguide.domain.dto.StockListResponse;
import com.stockguide.service.StockService;
import com.stockguide.service.StockSseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.List;

@RestController
@RequestMapping("/api/stocks")
@RequiredArgsConstructor
public class StockController {

    private final StockService stockService;
    private final StockSseService stockSseService;

    @GetMapping
    public ResponseEntity<List<StockListResponse>> getAllStocks() {
        return ResponseEntity.ok(stockService.getAllStocks());
    }

    @GetMapping("/{symbol}")
    public ResponseEntity<StockDetailResponse> getStockDetail(
            @PathVariable String symbol,
            @RequestParam(defaultValue = "daily") String period) {
        return ResponseEntity.ok(stockService.getStockDetail(symbol, period));
    }

    @GetMapping("/{symbol}/analysis")
    public ResponseEntity<AnalysisResponse> getAnalysis(@PathVariable String symbol) {
        return ResponseEntity.ok(stockService.getAnalysis(symbol));
    }

    /**
     * KIS 실시간 체결 SSE 스트림.
     * 프론트엔드 EventSource('/api/stocks/stream') 에서 구독.
     * 이벤트명: "price", 데이터: { symbol, price, priceChangeRate, volume }
     */
    @GetMapping(value = {"/stream", "/stream/sse"}, produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<StockSseService.PriceUpdate>> stream() {
        return stockSseService.flux()
            .map(update -> ServerSentEvent.<StockSseService.PriceUpdate>builder()
                .event("price")
                .data(update)
                .build());
    }
}
