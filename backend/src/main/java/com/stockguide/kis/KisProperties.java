package com.stockguide.kis;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "kis")
@Getter
@Setter
public class KisProperties {

    private String appKey = "";
    private String appSecret = "";
    private String mode = "paper";

    public boolean isConfigured() {
        return appKey != null && !appKey.isBlank()
            && appSecret != null && !appSecret.isBlank();
    }

    public String baseUrl() {
        return "real".equals(mode)
            ? "https://openapi.koreainvestment.com:9443"
            : "https://openapivts.koreainvestment.com:9443";
    }

    /** WebSocket 접속 URL (H0STCNT0 등 실시간 체결) */
    public String wsUrl() {
        return "real".equals(mode)
            ? "ws://ops.koreainvestment.com:21000"
            : "ws://ops.koreainvestment.com:31000";
    }
}
