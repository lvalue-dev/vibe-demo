package com.stockguide.domain.entity.enums;

public enum RiskLevel {
    LOW("낮음"),
    MEDIUM("보통"),
    HIGH("높음");

    private final String displayName;

    RiskLevel(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
