package com.stockguide.domain.dto;

import com.stockguide.domain.entity.enums.Recommendation;
import com.stockguide.domain.entity.enums.RiskLevel;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Builder
public class StockListResponse {
    private String symbol;
    private String name;
    private String market;
    private BigDecimal currentPrice;
    private BigDecimal priceChangeRate;
    private Long volume;
    private Recommendation recommendation;
    private String recommendationLabel;
    private Integer score;
    private RiskLevel risk;
    private String riskLabel;
    private LocalDateTime analyzedAt;
}
