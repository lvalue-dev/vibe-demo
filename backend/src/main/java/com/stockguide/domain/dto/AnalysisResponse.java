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
public class AnalysisResponse {
    private int score;
    private Recommendation recommendation;
    private String recommendationLabel;
    private RiskLevel risk;
    private String riskLabel;
    private List<String> reasons;
    private BigDecimal ma5;
    private BigDecimal ma20;
    private BigDecimal volumeRatio;
    private BigDecimal priceChangeRate;
    private LocalDateTime analyzedAt;
}
