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
                    // ── KOSPI ─────────────────────────────────────────────
                    Stock.builder().symbol("005930.KS").name("삼성전자").market("KOSPI").sector("반도체").build(),
                    Stock.builder().symbol("000660.KS").name("SK하이닉스").market("KOSPI").sector("반도체").build(),
                    Stock.builder().symbol("207940.KS").name("삼성바이오로직스").market("KOSPI").sector("바이오").build(),
                    Stock.builder().symbol("005380.KS").name("현대자동차").market("KOSPI").sector("자동차").build(),
                    Stock.builder().symbol("373220.KS").name("LG에너지솔루션").market("KOSPI").sector("전기차배터리").build(),
                    Stock.builder().symbol("000270.KS").name("기아").market("KOSPI").sector("자동차").build(),
                    Stock.builder().symbol("005490.KS").name("POSCO홀딩스").market("KOSPI").sector("철강").build(),
                    Stock.builder().symbol("035420.KS").name("NAVER").market("KOSPI").sector("IT").build(),
                    Stock.builder().symbol("068270.KS").name("셀트리온").market("KOSPI").sector("바이오").build(),
                    Stock.builder().symbol("051910.KS").name("LG화학").market("KOSPI").sector("화학").build(),
                    Stock.builder().symbol("105560.KS").name("KB금융").market("KOSPI").sector("금융").build(),
                    Stock.builder().symbol("035720.KS").name("카카오").market("KOSPI").sector("IT").build(),
                    Stock.builder().symbol("055550.KS").name("신한지주").market("KOSPI").sector("금융").build(),
                    Stock.builder().symbol("086790.KS").name("하나금융지주").market("KOSPI").sector("금융").build(),
                    Stock.builder().symbol("028260.KS").name("삼성물산").market("KOSPI").sector("건설·무역").build(),
                    Stock.builder().symbol("066570.KS").name("LG전자").market("KOSPI").sector("전자").build(),
                    Stock.builder().symbol("012330.KS").name("현대모비스").market("KOSPI").sector("자동차부품").build(),
                    Stock.builder().symbol("006400.KS").name("삼성SDI").market("KOSPI").sector("전기차배터리").build(),
                    Stock.builder().symbol("003670.KS").name("포스코퓨처엠").market("KOSPI").sector("2차전지소재").build(),
                    Stock.builder().symbol("323410.KS").name("카카오뱅크").market("KOSPI").sector("인터넷은행").build(),
                    Stock.builder().symbol("032830.KS").name("삼성생명").market("KOSPI").sector("보험").build(),
                    Stock.builder().symbol("017670.KS").name("SK텔레콤").market("KOSPI").sector("통신").build(),
                    Stock.builder().symbol("030200.KS").name("KT").market("KOSPI").sector("통신").build(),
                    Stock.builder().symbol("003490.KS").name("대한항공").market("KOSPI").sector("항공").build(),
                    Stock.builder().symbol("096770.KS").name("SK이노베이션").market("KOSPI").sector("에너지").build(),
                    Stock.builder().symbol("033780.KS").name("KT&G").market("KOSPI").sector("담배·식품").build(),
                    // ── KOSDAQ ────────────────────────────────────────────
                    Stock.builder().symbol("247540.KQ").name("에코프로비엠").market("KOSDAQ").sector("2차전지소재").build(),
                    Stock.builder().symbol("086520.KQ").name("에코프로").market("KOSDAQ").sector("2차전지소재").build(),
                    Stock.builder().symbol("196170.KQ").name("알테오젠").market("KOSDAQ").sector("바이오").build(),
                    Stock.builder().symbol("091990.KQ").name("셀트리온헬스케어").market("KOSDAQ").sector("바이오").build(),
                    Stock.builder().symbol("041510.KQ").name("SM엔터테인먼트").market("KOSDAQ").sector("엔터").build(),
                    Stock.builder().symbol("035900.KQ").name("JYP Ent.").market("KOSDAQ").sector("엔터").build(),
                    Stock.builder().symbol("122870.KQ").name("와이지엔터테인먼트").market("KOSDAQ").sector("엔터").build(),
                    Stock.builder().symbol("357780.KQ").name("솔브레인").market("KOSDAQ").sector("반도체소재").build(),
                    // ── NASDAQ ────────────────────────────────────────────
                    Stock.builder().symbol("AAPL").name("Apple").market("NASDAQ").sector("소비자전자").build(),
                    Stock.builder().symbol("MSFT").name("Microsoft").market("NASDAQ").sector("소프트웨어").build(),
                    Stock.builder().symbol("NVDA").name("NVIDIA").market("NASDAQ").sector("반도체").build(),
                    Stock.builder().symbol("GOOGL").name("Alphabet").market("NASDAQ").sector("인터넷").build(),
                    Stock.builder().symbol("META").name("Meta Platforms").market("NASDAQ").sector("소셜미디어").build(),
                    Stock.builder().symbol("AMZN").name("Amazon").market("NASDAQ").sector("e-커머스").build(),
                    Stock.builder().symbol("TSLA").name("Tesla").market("NASDAQ").sector("전기차").build(),
                    Stock.builder().symbol("AVGO").name("Broadcom").market("NASDAQ").sector("반도체").build(),
                    Stock.builder().symbol("NFLX").name("Netflix").market("NASDAQ").sector("스트리밍").build(),
                    Stock.builder().symbol("AMD").name("AMD").market("NASDAQ").sector("반도체").build(),
                    // ── NYSE ──────────────────────────────────────────────
                    Stock.builder().symbol("JPM").name("JPMorgan Chase").market("NYSE").sector("금융").build(),
                    Stock.builder().symbol("V").name("Visa").market("NYSE").sector("금융결제").build(),
                    Stock.builder().symbol("WMT").name("Walmart").market("NYSE").sector("유통").build(),
                    Stock.builder().symbol("XOM").name("ExxonMobil").market("NYSE").sector("에너지").build(),
                    Stock.builder().symbol("JNJ").name("Johnson & Johnson").market("NYSE").sector("헬스케어").build(),
                    Stock.builder().symbol("UNH").name("UnitedHealth").market("NYSE").sector("헬스케어").build(),
                    Stock.builder().symbol("HD").name("Home Depot").market("NYSE").sector("유통").build(),
                    Stock.builder().symbol("BAC").name("Bank of America").market("NYSE").sector("금융").build(),
                    Stock.builder().symbol("KO").name("Coca-Cola").market("NYSE").sector("음료").build(),
                    Stock.builder().symbol("MRK").name("Merck").market("NYSE").sector("제약").build()
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
