package com.stockguide.controller;

import com.stockguide.domain.dto.AnalysisResponse;
import com.stockguide.domain.dto.StockDetailResponse;
import com.stockguide.domain.dto.StockListResponse;
import com.stockguide.service.StockService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stocks")
@RequiredArgsConstructor
public class StockController {

    private final StockService stockService;

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
}
