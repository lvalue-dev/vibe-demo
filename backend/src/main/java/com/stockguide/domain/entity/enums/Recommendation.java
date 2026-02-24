package com.stockguide.domain.entity.enums;

public enum Recommendation {
    STRONG_BUY("강한 매수"),
    BUY("매수 적절"),
    HOLD("관망"),
    SELL("매도");

    private final String displayName;

    Recommendation(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }

    public static Recommendation fromScore(int score) {
        if (score >= 80) return STRONG_BUY;
        if (score >= 60) return BUY;
        if (score >= 40) return HOLD;
        return SELL;
    }
}
