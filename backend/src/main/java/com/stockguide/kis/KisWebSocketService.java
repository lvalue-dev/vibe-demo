package com.stockguide.kis;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stockguide.repository.StockRepository;
import com.stockguide.service.StockSseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.socket.WebSocketMessage;
import org.springframework.web.reactive.socket.client.ReactorNettyWebSocketClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * KIS 국내주식 실시간 체결 WebSocket 서비스 (H0STCNT0)
 *
 * - 앱 시작 시 활성 국내 종목을 자동으로 구독합니다.
 * - 연결이 끊기면 5초 후 자동 재연결합니다.
 * - 구독 응답이 연속으로 전부 실패하면 재연결을 중단합니다 (모의투자 미지원 등).
 * - 최신 체결 데이터는 {@link #getLatestPrice(String)} 로 조회합니다.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class KisWebSocketService implements ApplicationListener<ApplicationReadyEvent> {

    private static final String TR_ID = "H0STCNT0";
    private static final int MAX_ALL_FAIL_SESSIONS = 3;

    private final KisProperties props;
    private final KisTokenService tokenService;
    private final StockRepository stockRepository;
    private final ObjectMapper objectMapper;
    private final StockSseService sseService;

    /** 종목코드 → 최신 실시간 체결 데이터 */
    private final ConcurrentHashMap<String, KisApiClient.KisPrice> latestPrices = new ConcurrentHashMap<>();

    /** KIS 단축종목코드(예: 005930) → Yahoo Finance 심볼(예: 005930.KS) 역매핑 */
    private final ConcurrentHashMap<String, String> codeToSymbol = new ConcurrentHashMap<>();

    private final AtomicBoolean running = new AtomicBoolean(false);
    /** 구독 성공이 0건인 세션이 연속으로 몇 번 발생했는지 */
    private final AtomicInteger consecutiveAllFailSessions = new AtomicInteger(0);

    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "kis-ws-reconnect");
        t.setDaemon(true);
        return t;
    });

    @Override
    public void onApplicationEvent(ApplicationReadyEvent event) {
        if (!props.isConfigured()) {
            log.info("[KIS-WS] KIS 설정 없음 - WebSocket 스킵");
            return;
        }
        running.set(true);
        // 앱 시작 블로킹 방지를 위해 비동기 실행
        scheduler.submit(this::connectAndSubscribe);
    }

    /** 실시간 체결가 조회 (없으면 null) */
    public KisApiClient.KisPrice getLatestPrice(String stockCode) {
        return latestPrices.get(stockCode);
    }

    private void connectAndSubscribe() {
        if (!running.get()) return;

        try {
            List<String> codes = getDomesticCodes();
            if (codes.isEmpty()) {
                log.info("[KIS-WS] 구독할 국내 종목 없음");
                return;
            }

            String approvalKey = tokenService.getApprovalKey();
            String wsUrl = props.wsUrl();
            log.info("[KIS-WS] 접속 중: {} (종목 {}개)", wsUrl, codes.size());

            // 이 세션에서 구독 성공한 종목 수 추적
            AtomicInteger sessionSuccessCount = new AtomicInteger(0);

            // PONG 전송용 Sink (구독 응답 이후에도 계속 살아있어야 함)
            Sinks.Many<WebSocketMessage> pongSink = Sinks.many().multicast().onBackpressureBuffer();

            ReactorNettyWebSocketClient wsClient = new ReactorNettyWebSocketClient();
            wsClient.execute(URI.create(wsUrl), session -> {
                // 1) 초기 구독 메시지 전송
                Flux<WebSocketMessage> subscriptions = Flux.fromIterable(codes)
                    .map(code -> buildSubscribeMsg(approvalKey, code))
                    .map(session::textMessage);

                // 2) 수신 처리 (데이터 파싱 + PONG 전송)
                Mono<Void> receive = session.receive()
                    .doOnNext(msg -> handleMessage(msg.getPayloadAsText(), session, pongSink, sessionSuccessCount))
                    .then();

                // 3) 구독 메시지 먼저, 이후 PONG 송신 대기
                Flux<WebSocketMessage> output = Flux.concat(subscriptions, pongSink.asFlux());

                return Mono.zip(session.send(output), receive).then();
            })
            .doOnError(e -> log.error("[KIS-WS] 오류: {}", e.getMessage()))
            .doOnTerminate(() -> scheduleReconnect(sessionSuccessCount.get()))
            .subscribe();

        } catch (Exception e) {
            log.error("[KIS-WS] 접속 실패: {}", e.getMessage());
            if (running.get()) {
                scheduler.schedule(this::connectAndSubscribe, 10, TimeUnit.SECONDS);
            }
        }
    }

    private void scheduleReconnect(int sessionSuccessCount) {
        if (!running.get()) return;

        if (sessionSuccessCount == 0) {
            int failCount = consecutiveAllFailSessions.incrementAndGet();
            if (failCount >= MAX_ALL_FAIL_SESSIONS) {
                log.warn("[KIS-WS] 구독 실패 {}회 연속 - 실시간 체결 WebSocket 중단 (모의투자 미지원 또는 설정 오류). REST 폴링으로 동작합니다.", failCount);
                running.set(false);
                return;
            }
            log.info("[KIS-WS] 구독 성공 0건 ({}/{}회) - 5초 후 재접속", failCount, MAX_ALL_FAIL_SESSIONS);
        } else {
            consecutiveAllFailSessions.set(0);
            log.info("[KIS-WS] 연결 종료 (구독 성공: {}건) - 5초 후 재접속", sessionSuccessCount);
        }
        scheduler.schedule(this::connectAndSubscribe, 5, TimeUnit.SECONDS);
    }

    private void handleMessage(String payload, org.springframework.web.reactive.socket.WebSocketSession session,
                                Sinks.Many<WebSocketMessage> pongSink, AtomicInteger sessionSuccessCount) {
        try {
            if (payload.startsWith("{")) {
                handleJsonMessage(payload, session, pongSink, sessionSuccessCount);
            } else {
                handleDataMessage(payload);
            }
        } catch (Exception e) {
            log.debug("[KIS-WS] 메시지 처리 오류: {}", e.getMessage());
        }
    }

    private void handleJsonMessage(String payload,
                                    org.springframework.web.reactive.socket.WebSocketSession session,
                                    Sinks.Many<WebSocketMessage> pongSink,
                                    AtomicInteger sessionSuccessCount) {
        try {
            JsonNode node = objectMapper.readTree(payload);
            String trId = node.path("header").path("tr_id").asText();

            if ("PINGPONG".equals(trId)) {
                String datetime = node.path("header").path("datetime").asText();
                String pong = objectMapper.writeValueAsString(
                    Map.of("header", Map.of("tr_id", "PONG", "datetime", datetime))
                );
                pongSink.tryEmitNext(session.textMessage(pong));
                log.debug("[KIS-WS] PONG 전송");
            } else {
                String rtCd = node.path("body").path("rt_cd").asText();
                String msg1 = node.path("body").path("msg1").asText();
                String trKey = node.path("header").path("tr_key").asText();
                if ("0".equals(rtCd)) {
                    sessionSuccessCount.incrementAndGet();
                    log.debug("[KIS-WS] 구독 성공: {}", trKey);
                } else {
                    log.debug("[KIS-WS] 구독 실패 {}: {}", trKey, msg1);
                }
            }
        } catch (Exception e) {
            log.debug("[KIS-WS] JSON 파싱 오류: {}", e.getMessage());
        }
    }

    /**
     * H0STCNT0 파이프 구분 데이터 파싱
     *
     * 형식: {encryptFlag}|{tr_id}|{dataCount}|{field0}|{field1}|...
     *
     * 주요 필드 인덱스 (parts 배열 기준):
     *   [3]  MKSC_SHRN_ISCD  단축종목코드
     *   [4]  STCK_CNTG_HOUR  체결시간
     *   [5]  STCK_PRPR       현재가
     *   [7]  PRDY_VRSS       전일대비
     *   [10] STCK_OPRC       시가
     *   [11] STCK_HGPR       고가
     *   [12] STCK_LWPR       저가
     *   [16] ACML_VOL        누적거래량
     *   [27] STCK_SDPR       기준가(전일종가)
     */
    private void handleDataMessage(String payload) {
        String[] parts = payload.split("\\|");
        if (parts.length < 28) return;

        String trId = parts[1];
        if (!TR_ID.equals(trId)) return;

        String code      = parts[3];
        BigDecimal price     = decimal(parts, 5);
        BigDecimal open      = decimal(parts, 10);
        BigDecimal high      = decimal(parts, 11);
        BigDecimal low       = decimal(parts, 12);
        long volume          = longVal(parts, 16);
        BigDecimal prevClose = decimal(parts, 27);

        KisApiClient.KisPrice kisPrice = new KisApiClient.KisPrice(price, prevClose, open, high, low, volume);
        latestPrices.put(code, kisPrice);
        log.debug("[KIS-WS] {} 체결: {}", code, price);

        // SSE 브로드캐스트: 전일대비율 계산 후 프론트엔드로 전송
        String yahooSymbol = codeToSymbol.get(code);
        if (yahooSymbol != null && price != null && prevClose != null
                && prevClose.compareTo(BigDecimal.ZERO) != 0) {
            BigDecimal changeRate = price.subtract(prevClose)
                .divide(prevClose, 6, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .setScale(2, RoundingMode.HALF_UP);
            sseService.publish(yahooSymbol, price, changeRate, volume);
        }
    }

    // ── 구독 메시지 빌더 ────────────────────────────────────────────────────

    private String buildSubscribeMsg(String approvalKey, String code) {
        return """
            {"header":{"approval_key":"%s","custtype":"P","tr_type":"1","content-type":"utf-8"},\
            "body":{"input":{"tr_id":"%s","tr_key":"%s"}}}
            """.formatted(approvalKey, TR_ID, code).strip();
    }

    // ── 국내 종목 코드 추출 ─────────────────────────────────────────────────

    private List<String> getDomesticCodes() {
        codeToSymbol.clear();
        return stockRepository.findByIsActiveTrue().stream()
            .filter(s -> "KOSPI".equals(s.getMarket()) || "KOSDAQ".equals(s.getMarket()))
            .map(s -> {
                String sym = s.getSymbol();
                String code;
                if (sym.endsWith(".KS") || sym.endsWith(".KQ")) {
                    code = sym.substring(0, sym.length() - 3);
                } else {
                    code = sym;
                }
                codeToSymbol.put(code, sym);
                return code;
            })
            .distinct()
            .toList();
    }

    // ── 유틸 ────────────────────────────────────────────────────────────────

    private BigDecimal decimal(String[] parts, int idx) {
        if (idx >= parts.length) return null;
        try {
            String v = parts[idx].trim();
            return v.isEmpty() ? null : new BigDecimal(v);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private long longVal(String[] parts, int idx) {
        if (idx >= parts.length) return 0L;
        try {
            return Long.parseLong(parts[idx].trim());
        } catch (NumberFormatException e) {
            return 0L;
        }
    }
}
