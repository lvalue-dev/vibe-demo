package com.stockguide.domain.dto;

import com.stockguide.domain.entity.enums.Recommendation;
import com.stockguide.domain.entity.enums.RiskLevel;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class StockDetailResponse {
    private String symbol;
    private String name;
    private String market;
    private String sector;

    // 현재 가격 정보
    private BigDecimal currentPrice;
    private BigDecimal prevClose;
    private BigDecimal priceChangeRate;
    private Long volume;

    // 분석 결과
    private Integer score;
    private Recommendation recommendation;
    private String recommendationLabel;
    private RiskLevel risk;
    private String riskLabel;
    private List<String> reasons;

    // 기술 지표
    private BigDecimal ma5;
    private BigDecimal ma20;
    private BigDecimal volumeRatio;

    // 차트 데이터
    private List<PricePoint> chartData;

    private LocalDateTime analyzedAt;

    @Getter
    @Builder
    public static class PricePoint {
        private String time;
        private BigDecimal price;
        private BigDecimal ma5;
        private BigDecimal ma20;
        private Long volume;
    }
}
