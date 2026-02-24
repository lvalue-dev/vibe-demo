package com.stockguide.domain.dto;

import com.stockguide.domain.entity.enums.Recommendation;
import com.stockguide.domain.entity.enums.RiskLevel;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@Builder
public class PortfolioResponse {
    private Long id;
    private String symbol;
    private String name;
    private String market;
    private BigDecimal avgPrice;
    private Integer quantity;
    private BigDecimal currentPrice;
    private BigDecimal totalInvested;
    private BigDecimal currentValue;
    private BigDecimal profitLoss;
    private BigDecimal returnRate;
    private Recommendation recommendation;
    private String recommendationLabel;
    private Integer score;
    private RiskLevel risk;
    private String riskLabel;
}
