package com.stockguide.analysis;

import com.stockguide.domain.entity.StockPrice;
import com.stockguide.domain.entity.enums.Recommendation;
import com.stockguide.domain.entity.enums.RiskLevel;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/**
 * 핵심 분석 엔진
 *
 * 점수 계산 기준:
 * - 현재가 < MA20       → +20점 (저평가 구간)
 * - MA5 > MA20          → +20점 (단기 상승세)
 * - 거래량 증가 (1.5배+) → +20점
 * - 상승 추세 (양봉)     → +20점
 * - 변동성 낮음 (5% 미만)→ +20점
 */
@Component
@Slf4j
public class StockAnalysisEngine {

    private static final int MAX_SCORE_PER_CRITERION = 20;
    private static final BigDecimal VOLUME_SURGE_THRESHOLD = BigDecimal.valueOf(1.5);
    private static final BigDecimal HIGH_VOLATILITY_THRESHOLD = BigDecimal.valueOf(0.05);

    public AnalysisResult analyze(List<StockPrice> priceHistory) {
        if (priceHistory == null || priceHistory.size() < 5) {
            return buildDefaultResult(priceHistory);
        }

        BigDecimal currentPrice = priceHistory.get(priceHistory.size() - 1).getPrice();
        BigDecimal prevClose = priceHistory.get(priceHistory.size() - 1).getPrevClose();

        BigDecimal ma5 = calculateMA(priceHistory, 5);
        BigDecimal ma20 = priceHistory.size() >= 20 ? calculateMA(priceHistory, 20) : ma5;

        BigDecimal volumeRatio = calculateVolumeRatio(priceHistory);
        BigDecimal priceChangeRate = calculatePriceChangeRate(currentPrice, prevClose);
        BigDecimal volatility = calculateVolatility(priceHistory);

        int score = 0;
        List<String> reasons = new ArrayList<>();

        // 기준 1: 현재가 < MA20 (저평가 구간)
        if (ma20 != null && currentPrice.compareTo(ma20) < 0) {
            score += MAX_SCORE_PER_CRITERION;
            BigDecimal discount = ma20.subtract(currentPrice)
                    .divide(ma20, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(1, RoundingMode.HALF_UP);
            reasons.add("현재 가격이 20일 평균보다 " + discount + "% 낮음 (저평가 구간)");
        }

        // 기준 2: MA5 > MA20 (단기 골든크로스)
        if (ma5 != null && ma20 != null && ma5.compareTo(ma20) > 0) {
            score += MAX_SCORE_PER_CRITERION;
            reasons.add("단기(5일) 이동평균이 장기(20일)를 상회 - 상승 모멘텀");
        }

        // 기준 3: 거래량 급증 (평균 대비 1.5배 이상)
        if (volumeRatio != null && volumeRatio.compareTo(VOLUME_SURGE_THRESHOLD) >= 0) {
            score += MAX_SCORE_PER_CRITERION;
            String ratioStr = volumeRatio.setScale(1, RoundingMode.HALF_UP).toString();
            reasons.add("거래량이 평균 대비 " + ratioStr + "배 증가 - 관심 집중");
        }

        // 기준 4: 상승 추세 (양봉, 전일 대비 양수)
        if (priceChangeRate != null && priceChangeRate.compareTo(BigDecimal.ZERO) > 0) {
            score += MAX_SCORE_PER_CRITERION;
            String changeStr = priceChangeRate.multiply(BigDecimal.valueOf(100))
                    .setScale(2, RoundingMode.HALF_UP).toString();
            reasons.add("전일 대비 +" + changeStr + "% 상승 중");
        }

        // 기준 5: 변동성 낮음 (5% 미만)
        if (volatility != null && volatility.compareTo(HIGH_VOLATILITY_THRESHOLD) < 0) {
            score += MAX_SCORE_PER_CRITERION;
            reasons.add("변동성 낮음 - 안정적인 가격 흐름");
        } else if (volatility != null) {
            reasons.add("변동성 높음 - 단기 급등락 주의");
        }

        if (reasons.isEmpty()) {
            reasons.add("분석 데이터 불충분 - 관망 권장");
        }

        Recommendation recommendation = Recommendation.fromScore(score);
        RiskLevel risk = calculateRisk(score, volatility);

        return AnalysisResult.builder()
                .score(score)
                .recommendation(recommendation)
                .risk(risk)
                .reasons(reasons)
                .currentPrice(currentPrice)
                .ma5(ma5)
                .ma20(ma20)
                .volumeRatio(volumeRatio)
                .priceChangeRate(priceChangeRate)
                .build();
    }

    private BigDecimal calculateMA(List<StockPrice> prices, int period) {
        int size = prices.size();
        if (size < period) return null;

        BigDecimal sum = BigDecimal.ZERO;
        for (int i = size - period; i < size; i++) {
            sum = sum.add(prices.get(i).getPrice());
        }
        return sum.divide(BigDecimal.valueOf(period), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateVolumeRatio(List<StockPrice> prices) {
        if (prices.size() < 2) return null;

        long currentVolume = prices.get(prices.size() - 1).getVolume();
        long totalVolume = 0;
        int count = Math.min(20, prices.size() - 1);

        for (int i = prices.size() - 1 - count; i < prices.size() - 1; i++) {
            totalVolume += prices.get(i).getVolume();
        }

        if (count == 0 || totalVolume == 0) return BigDecimal.ONE;

        double avgVolume = (double) totalVolume / count;
        return BigDecimal.valueOf(currentVolume / avgVolume)
                .setScale(4, RoundingMode.HALF_UP);
    }

    private BigDecimal calculatePriceChangeRate(BigDecimal currentPrice, BigDecimal prevClose) {
        if (prevClose == null || prevClose.compareTo(BigDecimal.ZERO) == 0) return BigDecimal.ZERO;
        return currentPrice.subtract(prevClose)
                .divide(prevClose, 4, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateVolatility(List<StockPrice> prices) {
        int count = Math.min(20, prices.size());
        if (count < 2) return BigDecimal.ZERO;

        BigDecimal sum = BigDecimal.ZERO;
        for (int i = prices.size() - count; i < prices.size(); i++) {
            StockPrice p = prices.get(i);
            if (p.getHighPrice() != null && p.getLowPrice() != null && p.getPrice().compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal range = p.getHighPrice().subtract(p.getLowPrice())
                        .divide(p.getPrice(), 4, RoundingMode.HALF_UP);
                sum = sum.add(range);
            }
        }
        return sum.divide(BigDecimal.valueOf(count), 4, RoundingMode.HALF_UP);
    }

    private RiskLevel calculateRisk(int score, BigDecimal volatility) {
        boolean highVol = volatility != null && volatility.compareTo(HIGH_VOLATILITY_THRESHOLD) >= 0;
        if (score < 40 || highVol) return RiskLevel.HIGH;
        if (score < 60) return RiskLevel.MEDIUM;
        return RiskLevel.LOW;
    }

    private AnalysisResult buildDefaultResult(List<StockPrice> priceHistory) {
        BigDecimal currentPrice = (priceHistory != null && !priceHistory.isEmpty())
                ? priceHistory.get(priceHistory.size() - 1).getPrice()
                : BigDecimal.ZERO;

        return AnalysisResult.builder()
                .score(40)
                .recommendation(Recommendation.HOLD)
                .risk(RiskLevel.MEDIUM)
                .reasons(List.of("데이터 수집 중입니다. 잠시 후 다시 확인해 주세요."))
                .currentPrice(currentPrice)
                .build();
    }
}
