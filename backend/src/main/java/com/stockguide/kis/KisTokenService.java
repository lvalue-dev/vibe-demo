package com.stockguide.kis;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.atomic.AtomicLong;

@Service
@RequiredArgsConstructor
@Slf4j
public class KisTokenService {

    private final KisProperties props;
    private final WebClient webClient;

    private final AtomicReference<String> cachedToken = new AtomicReference<>();
    private volatile Instant tokenExpiry = Instant.EPOCH;

    private final AtomicReference<String> cachedApprovalKey = new AtomicReference<>();
    private volatile Instant approvalKeyExpiry = Instant.EPOCH;

    public String getToken() {
        if (cachedToken.get() != null && Instant.now().isBefore(tokenExpiry)) {
            return cachedToken.get();
        }
        return issueToken();
    }

    @SuppressWarnings("unchecked")
    private synchronized String issueToken() {
        // double-check after acquiring lock
        if (cachedToken.get() != null && Instant.now().isBefore(tokenExpiry)) {
            return cachedToken.get();
        }

        Map<String, String> body = Map.of(
            "grant_type", "client_credentials",
            "appkey", props.getAppKey(),
            "appsecret", props.getAppSecret()
        );

        Map<String, Object> response = webClient.post()
            .uri(props.baseUrl() + "/oauth2/tokenP")
            .bodyValue(body)
            .retrieve()
            .bodyToMono(Map.class)
            .block();

        if (response == null) {
            throw new IllegalStateException("KIS token response is null");
        }

        String token = (String) response.get("access_token");
        Number expiresIn = (Number) response.get("expires_in");
        long ttl = expiresIn != null ? expiresIn.longValue() : 86400L;

        cachedToken.set(token);
        tokenExpiry = Instant.now().plusSeconds(ttl - 300); // 5분 앞서 갱신
        log.info("[KIS] Token issued, expires in {}s", ttl);
        return token;
    }

    /**
     * WebSocket 접속용 Approval Key 발급 (H0STCNT0 등 실시간 API에 필요)
     * POST /oauth2/Approval
     */
    public String getApprovalKey() {
        if (cachedApprovalKey.get() != null && Instant.now().isBefore(approvalKeyExpiry)) {
            return cachedApprovalKey.get();
        }
        return issueApprovalKey();
    }

    @SuppressWarnings("unchecked")
    private synchronized String issueApprovalKey() {
        if (cachedApprovalKey.get() != null && Instant.now().isBefore(approvalKeyExpiry)) {
            return cachedApprovalKey.get();
        }

        Map<String, String> body = Map.of(
            "grant_type", "client_credentials",
            "appkey", props.getAppKey(),
            "secretkey", props.getAppSecret()
        );

        Map<String, Object> response = webClient.post()
            .uri(props.baseUrl() + "/oauth2/Approval")
            .bodyValue(body)
            .retrieve()
            .bodyToMono(Map.class)
            .block();

        if (response == null) {
            throw new IllegalStateException("KIS approval key response is null");
        }

        String key = (String) response.get("approval_key");
        if (key == null || key.isBlank()) {
            throw new IllegalStateException("KIS approval key is empty: " + response);
        }

        cachedApprovalKey.set(key);
        approvalKeyExpiry = Instant.now().plusSeconds(86400 - 300); // 하루 유효
        log.info("[KIS] WebSocket Approval Key issued");
        return key;
    }
}
