package com.stockguide.analysis;

import com.stockguide.domain.entity.enums.Recommendation;
import com.stockguide.domain.entity.enums.RiskLevel;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Builder
public class AnalysisResult {
    private int score;
    private Recommendation recommendation;
    private RiskLevel risk;
    private List<String> reasons;
    private BigDecimal currentPrice;
    private BigDecimal ma5;
    private BigDecimal ma20;
    private BigDecimal volumeRatio;
    private BigDecimal priceChangeRate;
}
