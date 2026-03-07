package com.stockguide.kis;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * KIS(한국투자증권) Open API 클라이언트
 *
 * Yahoo Finance 심볼 기준으로 입력받아 KIS API를 호출합니다.
 *   - .KS  → 국내 KOSPI  (inquire-price, tr_id=FHKST01010100)
 *   - .KQ  → 국내 KOSDAQ (inquire-price, tr_id=FHKST01010100)
 *   - 그 외 → 해외        (overseas-price, tr_id=HHDFS00000300)
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class KisApiClient {

    private static final Set<String> NASDAQ_SET = Set.of(
        "AAPL", "MSFT", "NVDA", "GOOGL", "GOOG", "META", "AMZN", "TSLA",
        "AVGO", "ADBE", "ASML", "QCOM", "NFLX", "INTC", "AMD", "COST",
        "PYPL", "SBUX", "TXN", "AMAT", "ADI", "MU", "REGN", "LRCX"
    );

    private final KisProperties props;
    private final KisTokenService tokenService;
    private final WebClient webClient;

    /** 실시간 WebSocket 캐시 (선택적 - 없어도 REST 폴백 동작) */
    @Autowired(required = false)
    @Nullable
    private KisWebSocketService wsService;

    public record KisPrice(
        BigDecimal price,
        BigDecimal prevClose,
        BigDecimal openPrice,
        BigDecimal highPrice,
        BigDecimal lowPrice,
        long volume
    ) {}

    public record KisDailyPrice(
        LocalDate date,
        BigDecimal closePrice,
        BigDecimal openPrice,
        BigDecimal highPrice,
        BigDecimal lowPrice,
        long volume
    ) {}

    /** Yahoo Finance 심볼 → 과거 일봉 데이터 조회 (최근 days일) */
    public List<KisDailyPrice> fetchDailyHistory(String symbol, int days) {
        if (symbol.endsWith(".KS") || symbol.endsWith(".KQ")) {
            return fetchDomesticHistory(symbol.substring(0, symbol.length() - 3), days);
        } else {
            String exchange = NASDAQ_SET.contains(symbol) ? "NAS" : "NYS";
            return fetchOverseasHistory(exchange, symbol, days);
        }
    }

    @SuppressWarnings("unchecked")
    private List<KisDailyPrice> fetchDomesticHistory(String code, int days) {
        try {
            String endDate = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
            Map<String, Object> response = webClient.get()
                .uri(props.baseUrl() + "/uapi/domestic-stock/v1/quotations/inquire-daily-price"
                    + "?FID_COND_MRKT_DIV_CODE=J"
                    + "&FID_INPUT_ISCD=" + code
                    + "&FID_PERIOD_DIV_CODE=D"
                    + "&FID_ORG_ADJ_PRC=0")
                .header("authorization", "Bearer " + tokenService.getToken())
                .header("appkey", props.getAppKey())
                .header("appsecret", props.getAppSecret())
                .header("tr_id", "FHKST01010400")
                .header("custtype", "P")
                .retrieve()
                .bodyToMono(Map.class)
                .onErrorResume(e -> {
                    log.warn("[KIS] Domestic history error for {}: {}", code, e.getMessage());
                    return Mono.empty();
                })
                .block();

            if (response == null || !"0".equals(response.get("rt_cd"))) return Collections.emptyList();

            List<Map<String, Object>> output2 = (List<Map<String, Object>>) response.get("output2");
            if (output2 == null) return Collections.emptyList();

            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyyMMdd");
            return output2.stream()
                .limit(days)
                .filter(o -> o.get("stck_bsop_date") != null && !o.get("stck_bsop_date").toString().isBlank())
                .map(o -> new KisDailyPrice(
                    LocalDate.parse(o.get("stck_bsop_date").toString(), fmt),
                    decimal(o, "stck_clpr"),
                    decimal(o, "stck_oprc"),
                    decimal(o, "stck_hgpr"),
                    decimal(o, "stck_lwpr"),
                    longVal(o, "acml_vol")
                ))
                .filter(p -> p.closePrice() != null && p.closePrice().compareTo(BigDecimal.ZERO) > 0)
                .toList();
        } catch (Exception e) {
            log.error("[KIS] Domestic history error for {}: {}", code, e.getMessage());
            return Collections.emptyList();
        }
    }

    @SuppressWarnings("unchecked")
    private List<KisDailyPrice> fetchOverseasHistory(String exchange, String symbol, int days) {
        try {
            String endDate = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
            Map<String, Object> response = webClient.get()
                .uri(props.baseUrl() + "/uapi/overseas-price/v1/quotations/dailyprice"
                    + "?AUTH="
                    + "&EXCD=" + exchange
                    + "&SYMB=" + symbol
                    + "&GUBN=0"
                    + "&BYMD=" + endDate
                    + "&MODP=0")
                .header("authorization", "Bearer " + tokenService.getToken())
                .header("appkey", props.getAppKey())
                .header("appsecret", props.getAppSecret())
                .header("tr_id", "HHDFS76240000")
                .header("custtype", "P")
                .retrieve()
                .bodyToMono(Map.class)
                .onErrorResume(e -> {
                    log.warn("[KIS] Overseas history error for {}/{}: {}", exchange, symbol, e.getMessage());
                    return Mono.empty();
                })
                .block();

            if (response == null || !"0".equals(response.get("rt_cd"))) return Collections.emptyList();

            List<Map<String, Object>> output2 = (List<Map<String, Object>>) response.get("output2");
            if (output2 == null) return Collections.emptyList();

            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyyMMdd");
            return output2.stream()
                .limit(days)
                .filter(o -> o.get("xymd") != null && !o.get("xymd").toString().isBlank())
                .map(o -> new KisDailyPrice(
                    LocalDate.parse(o.get("xymd").toString(), fmt),
                    decimal(o, "clos"),
                    decimal(o, "open"),
                    decimal(o, "high"),
                    decimal(o, "low"),
                    longVal(o, "tvol")
                ))
                .filter(p -> p.closePrice() != null && p.closePrice().compareTo(BigDecimal.ZERO) > 0)
                .toList();
        } catch (Exception e) {
            log.error("[KIS] Overseas history error for {}/{}: {}", exchange, symbol, e.getMessage());
            return Collections.emptyList();
        }
    }

    /** Yahoo Finance 심볼 → KIS 가격 조회 */
    public KisPrice fetchPrice(String symbol) {
        if (symbol.endsWith(".KS")) {
            return fetchDomestic(symbol.substring(0, symbol.length() - 3));
        } else if (symbol.endsWith(".KQ")) {
            return fetchDomestic(symbol.substring(0, symbol.length() - 3));
        } else {
            String exchange = NASDAQ_SET.contains(symbol) ? "NAS" : "NYS";
            return fetchOverseas(exchange, symbol);
        }
    }

    @SuppressWarnings("unchecked")
    private KisPrice fetchDomestic(String code) {
        // 실시간 WebSocket 데이터가 있으면 우선 사용
        if (wsService != null) {
            KisPrice rt = wsService.getLatestPrice(code);
            if (rt != null && rt.price() != null) {
                log.debug("[KIS] {} 실시간 캐시 사용: {}", code, rt.price());
                return rt;
            }
        }
        try {
            Map<String, Object> response = webClient.get()
                .uri(props.baseUrl() + "/uapi/domestic-stock/v1/quotations/inquire-price"
                    + "?FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD=" + code)
                .header("authorization", "Bearer " + tokenService.getToken())
                .header("appkey", props.getAppKey())
                .header("appsecret", props.getAppSecret())
                .header("tr_id", "FHKST01010100")
                .header("custtype", "P")
                .retrieve()
                .bodyToMono(Map.class)
                .onErrorResume(e -> {
                    log.warn("[KIS] Domestic price error for {}: {}", code, e.getMessage());
                    return Mono.empty();
                })
                .block();

            if (response == null) return null;

            if (!"0".equals(response.get("rt_cd"))) {
                log.warn("[KIS] Domestic price failed for {}: {}", code, response.get("msg1"));
                return null;
            }

            Map<String, Object> o = (Map<String, Object>) response.get("output");
            return new KisPrice(
                decimal(o, "stck_prpr"),
                decimal(o, "stck_sdpr"),
                decimal(o, "stck_oprc"),
                decimal(o, "stck_hgpr"),
                decimal(o, "stck_lwpr"),
                longVal(o, "acml_vol")
            );
        } catch (Exception e) {
            log.error("[KIS] Domestic price error for {}: {}", code, e.getMessage());
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private KisPrice fetchOverseas(String exchange, String symbol) {
        try {
            Map<String, Object> response = webClient.get()
                .uri(props.baseUrl() + "/uapi/overseas-price/v1/quotations/price"
                    + "?AUTH=&EXCD=" + exchange + "&SYMB=" + symbol)
                .header("authorization", "Bearer " + tokenService.getToken())
                .header("appkey", props.getAppKey())
                .header("appsecret", props.getAppSecret())
                .header("tr_id", "HHDFS00000300")
                .header("custtype", "P")
                .retrieve()
                .bodyToMono(Map.class)
                .onErrorResume(e -> {
                    log.warn("[KIS] Overseas price error for {}/{}: {}", exchange, symbol, e.getMessage());
                    return Mono.empty();
                })
                .block();

            if (response == null) return null;

            if (!"0".equals(response.get("rt_cd"))) {
                log.warn("[KIS] Overseas price failed for {}/{}: {}", exchange, symbol, response.get("msg1"));
                return null;
            }

            Map<String, Object> o = (Map<String, Object>) response.get("output");
            return new KisPrice(
                decimal(o, "last"),
                decimal(o, "base"),
                decimal(o, "open"),
                decimal(o, "high"),
                decimal(o, "low"),
                longVal(o, "tvol")
            );
        } catch (Exception e) {
            log.error("[KIS] Overseas price error for {}/{}: {}", exchange, symbol, e.getMessage());
            return null;
        }
    }

    private BigDecimal decimal(Map<String, Object> map, String key) {
        Object val = map.get(key);
        if (val == null) return null;
        try {
            return new BigDecimal(val.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private long longVal(Map<String, Object> map, String key) {
        Object val = map.get(key);
        if (val == null) return 0L;
        try {
            return Long.parseLong(val.toString());
        } catch (NumberFormatException e) {
            return 0L;
        }
    }
}
