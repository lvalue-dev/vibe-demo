package com.stockguide.service;

import com.stockguide.domain.dto.WatchlistResponse;
import com.stockguide.domain.entity.Stock;
import com.stockguide.domain.entity.StockAnalysis;
import com.stockguide.domain.entity.StockPrice;
import com.stockguide.domain.entity.User;
import com.stockguide.domain.entity.Watchlist;
import com.stockguide.repository.StockAnalysisRepository;
import com.stockguide.repository.StockPriceRepository;
import com.stockguide.repository.StockRepository;
import com.stockguide.repository.WatchlistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WatchlistService {

    private final WatchlistRepository watchlistRepository;
    private final StockRepository stockRepository;
    private final StockPriceRepository stockPriceRepository;
    private final StockAnalysisRepository analysisRepository;

    public List<WatchlistResponse> getWatchlist(User user) {
        return watchlistRepository.findByUserWithStock(user).stream()
                .map(this::buildResponse)
                .toList();
    }

    @Transactional
    public WatchlistResponse addToWatchlist(User user, String symbol) {
        if (watchlistRepository.existsByUserAndStockSymbol(user, symbol.toUpperCase())) {
            throw new IllegalStateException("이미 관심 종목에 추가된 종목입니다: " + symbol);
        }

        Stock stock = stockRepository.findBySymbol(symbol.toUpperCase())
                .orElseThrow(() -> new IllegalArgumentException("종목을 찾을 수 없습니다: " + symbol));

        Watchlist watchlist = Watchlist.builder()
                .user(user)
                .stock(stock)
                .build();

        return buildResponse(watchlistRepository.save(watchlist));
    }

    @Transactional
    public void removeFromWatchlist(User user, String symbol) {
        Watchlist watchlist = watchlistRepository.findByUserAndStockSymbol(user, symbol.toUpperCase())
                .orElseThrow(() -> new IllegalArgumentException("관심 종목에 없는 종목입니다: " + symbol));
        watchlistRepository.delete(watchlist);
    }

    private WatchlistResponse buildResponse(Watchlist watchlist) {
        Stock stock = watchlist.getStock();
        StockPrice price = stockPriceRepository.findTopByStockOrderByTimestampDesc(stock).orElse(null);
        StockAnalysis analysis = analysisRepository.findTopByStockOrderByCreatedAtDesc(stock).orElse(null);

        BigDecimal currentPrice = price != null ? price.getPrice() : BigDecimal.ZERO;
        BigDecimal changeRate = (price != null && price.getPrevClose() != null && price.getPrevClose().compareTo(BigDecimal.ZERO) > 0)
                ? price.getPrice().subtract(price.getPrevClose()).divide(price.getPrevClose(), 4, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        return WatchlistResponse.builder()
                .id(watchlist.getId())
                .symbol(stock.getSymbol())
                .name(stock.getName())
                .market(stock.getMarket())
                .currentPrice(currentPrice)
                .priceChangeRate(changeRate)
                .recommendation(analysis != null ? analysis.getRecommendation() : null)
                .recommendationLabel(analysis != null ? analysis.getRecommendation().getDisplayName() : "분석 중")
                .score(analysis != null ? analysis.getScore() : null)
                .risk(analysis != null ? analysis.getRisk() : null)
                .riskLabel(analysis != null ? analysis.getRisk().getDisplayName() : "-")
                .addedAt(watchlist.getCreatedAt())
                .build();
    }
}
