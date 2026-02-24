package com.stockguide.service;

import com.stockguide.domain.dto.PortfolioRequest;
import com.stockguide.domain.dto.PortfolioResponse;
import com.stockguide.domain.entity.Portfolio;
import com.stockguide.domain.entity.Stock;
import com.stockguide.domain.entity.StockAnalysis;
import com.stockguide.domain.entity.StockPrice;
import com.stockguide.domain.entity.User;
import com.stockguide.repository.PortfolioRepository;
import com.stockguide.repository.StockAnalysisRepository;
import com.stockguide.repository.StockPriceRepository;
import com.stockguide.repository.StockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PortfolioService {

    private final PortfolioRepository portfolioRepository;
    private final StockRepository stockRepository;
    private final StockPriceRepository stockPriceRepository;
    private final StockAnalysisRepository analysisRepository;

    public List<PortfolioResponse> getPortfolio(User user) {
        return portfolioRepository.findByUserWithStock(user).stream()
                .map(this::buildResponse)
                .toList();
    }

    @Transactional
    public PortfolioResponse addOrUpdatePortfolio(User user, PortfolioRequest request) {
        Stock stock = stockRepository.findBySymbol(request.getSymbol().toUpperCase())
                .orElseThrow(() -> new IllegalArgumentException("종목을 찾을 수 없습니다: " + request.getSymbol()));

        Portfolio portfolio = portfolioRepository
                .findByUserAndStockSymbol(user, request.getSymbol().toUpperCase())
                .orElse(Portfolio.builder().user(user).stock(stock).build());

        portfolio.setAvgPrice(request.getAvgPrice());
        portfolio.setQuantity(request.getQuantity());

        return buildResponse(portfolioRepository.save(portfolio));
    }

    @Transactional
    public void removeFromPortfolio(User user, String symbol) {
        Portfolio portfolio = portfolioRepository.findByUserAndStockSymbol(user, symbol.toUpperCase())
                .orElseThrow(() -> new IllegalArgumentException("포트폴리오에 없는 종목입니다: " + symbol));
        portfolioRepository.delete(portfolio);
    }

    private PortfolioResponse buildResponse(Portfolio portfolio) {
        Stock stock = portfolio.getStock();
        StockPrice price = stockPriceRepository.findTopByStockOrderByTimestampDesc(stock).orElse(null);
        StockAnalysis analysis = analysisRepository.findTopByStockOrderByCreatedAtDesc(stock).orElse(null);

        BigDecimal currentPrice = price != null ? price.getPrice() : portfolio.getAvgPrice();
        BigDecimal totalInvested = portfolio.getAvgPrice().multiply(BigDecimal.valueOf(portfolio.getQuantity()));
        BigDecimal currentValue = currentPrice.multiply(BigDecimal.valueOf(portfolio.getQuantity()));
        BigDecimal profitLoss = currentValue.subtract(totalInvested);
        BigDecimal returnRate = totalInvested.compareTo(BigDecimal.ZERO) > 0
                ? profitLoss.divide(totalInvested, 4, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        return PortfolioResponse.builder()
                .id(portfolio.getId())
                .symbol(stock.getSymbol())
                .name(stock.getName())
                .market(stock.getMarket())
                .avgPrice(portfolio.getAvgPrice())
                .quantity(portfolio.getQuantity())
                .currentPrice(currentPrice)
                .totalInvested(totalInvested)
                .currentValue(currentValue)
                .profitLoss(profitLoss)
                .returnRate(returnRate)
                .recommendation(analysis != null ? analysis.getRecommendation() : null)
                .recommendationLabel(analysis != null ? analysis.getRecommendation().getDisplayName() : "분석 중")
                .score(analysis != null ? analysis.getScore() : null)
                .risk(analysis != null ? analysis.getRisk() : null)
                .riskLabel(analysis != null ? analysis.getRisk().getDisplayName() : "-")
                .build();
    }
}
