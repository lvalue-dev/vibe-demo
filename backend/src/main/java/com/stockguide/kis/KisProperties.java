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
}
