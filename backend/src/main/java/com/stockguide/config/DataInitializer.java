package com.stockguide.config;

import com.stockguide.domain.entity.Stock;
import com.stockguide.repository.StockRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * 초기 종목 데이터 설정
 * 한국 주요 종목 + 미국 주요 종목
 */
@Configuration
@RequiredArgsConstructor
@Slf4j
public class DataInitializer {

    private final StockRepository stockRepository;

    @Bean
    public ApplicationRunner initStocks() {
        return args -> {
            List<Stock> stocks = List.of(
                    // KOSPI 주요 종목 (Yahoo Finance: .KS suffix)
                    Stock.builder().symbol("005930.KS").name("삼성전자").market("KOSPI").sector("반도체").build(),
                    Stock.builder().symbol("000660.KS").name("SK하이닉스").market("KOSPI").sector("반도체").build(),
                    Stock.builder().symbol("035420.KS").name("NAVER").market("KOSPI").sector("IT").build(),
                    Stock.builder().symbol("035720.KS").name("카카오").market("KOSPI").sector("IT").build(),
                    Stock.builder().symbol("051910.KS").name("LG화학").market("KOSPI").sector("화학").build(),
                    Stock.builder().symbol("006400.KS").name("삼성SDI").market("KOSPI").sector("전기차배터리").build(),
                    Stock.builder().symbol("373220.KS").name("LG에너지솔루션").market("KOSPI").sector("전기차배터리").build(),
                    Stock.builder().symbol("207940.KS").name("삼성바이오로직스").market("KOSPI").sector("바이오").build(),
                    // NASDAQ 주요 종목
                    Stock.builder().symbol("AAPL").name("Apple").market("NASDAQ").sector("Technology").build(),
                    Stock.builder().symbol("NVDA").name("NVIDIA").market("NASDAQ").sector("Semiconductor").build(),
                    Stock.builder().symbol("MSFT").name("Microsoft").market("NASDAQ").sector("Technology").build(),
                    Stock.builder().symbol("AMZN").name("Amazon").market("NASDAQ").sector("E-Commerce").build(),
                    Stock.builder().symbol("GOOGL").name("Alphabet").market("NASDAQ").sector("Technology").build(),
                    Stock.builder().symbol("META").name("Meta").market("NASDAQ").sector("Social Media").build(),
                    Stock.builder().symbol("TSLA").name("Tesla").market("NASDAQ").sector("EV").build()
            );

            stocks.forEach(stock -> {
                if (!stockRepository.existsBySymbol(stock.getSymbol())) {
                    stockRepository.save(stock);
                    log.info("Initialized stock: {}", stock.getSymbol());
                }
            });
        };
    }
}
