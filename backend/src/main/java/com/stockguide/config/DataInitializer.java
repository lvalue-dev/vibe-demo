package com.stockguide.config;

import com.stockguide.collector.StockDataCollector;
import com.stockguide.domain.entity.Stock;
import com.stockguide.repository.StockRepository;
import com.stockguide.service.StockAnalysisService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * 초기 종목 데이터 설정
 * 한국 주요 종목 + 미국 주요 종목
 */
@Configuration
@RequiredArgsConstructor
@Slf4j
public class DataInitializer {

    private final StockRepository stockRepository;
    private final StockDataCollector stockDataCollector;
    private final StockAnalysisService stockAnalysisService;

    @Bean
    public ApplicationRunner initStocks() {
        return args -> {
            List<Stock> stocks = List.of(
                    // ── KOSPI ─────────────────────────────────────────────
                    Stock.builder().symbol("005930.KS").name("삼성전자").market("KOSPI").sector("반도체").build(),
                    Stock.builder().symbol("000660.KS").name("SK하이닉스").market("KOSPI").sector("반도체").build(),
                    Stock.builder().symbol("207940.KS").name("삼성바이오로직스").market("KOSPI").sector("바이오").build(),
                    Stock.builder().symbol("005380.KS").name("현대자동차").market("KOSPI").sector("자동차").build(),
                    Stock.builder().symbol("373220.KS").name("LG에너지솔루션").market("KOSPI").sector("전기차배터리").build(),
                    Stock.builder().symbol("000270.KS").name("기아").market("KOSPI").sector("자동차").build(),
                    Stock.builder().symbol("005490.KS").name("POSCO홀딩스").market("KOSPI").sector("철강").build(),
                    Stock.builder().symbol("035420.KS").name("NAVER").market("KOSPI").sector("IT").build(),
                    Stock.builder().symbol("068270.KS").name("셀트리온").market("KOSPI").sector("바이오").build(),
                    Stock.builder().symbol("051910.KS").name("LG화학").market("KOSPI").sector("화학").build(),
                    Stock.builder().symbol("105560.KS").name("KB금융").market("KOSPI").sector("금융").build(),
                    Stock.builder().symbol("035720.KS").name("카카오").market("KOSPI").sector("IT").build(),
                    Stock.builder().symbol("055550.KS").name("신한지주").market("KOSPI").sector("금융").build(),
                    Stock.builder().symbol("086790.KS").name("하나금융지주").market("KOSPI").sector("금융").build(),
                    Stock.builder().symbol("028260.KS").name("삼성물산").market("KOSPI").sector("건설·무역").build(),
                    Stock.builder().symbol("066570.KS").name("LG전자").market("KOSPI").sector("전자").build(),
                    Stock.builder().symbol("012330.KS").name("현대모비스").market("KOSPI").sector("자동차부품").build(),
                    Stock.builder().symbol("006400.KS").name("삼성SDI").market("KOSPI").sector("전기차배터리").build(),
                    Stock.builder().symbol("003670.KS").name("포스코퓨처엠").market("KOSPI").sector("2차전지소재").build(),
                    Stock.builder().symbol("323410.KS").name("카카오뱅크").market("KOSPI").sector("인터넷은행").build(),
                    Stock.builder().symbol("032830.KS").name("삼성생명").market("KOSPI").sector("보험").build(),
                    Stock.builder().symbol("017670.KS").name("SK텔레콤").market("KOSPI").sector("통신").build(),
                    Stock.builder().symbol("030200.KS").name("KT").market("KOSPI").sector("통신").build(),
                    Stock.builder().symbol("003490.KS").name("대한항공").market("KOSPI").sector("항공").build(),
                    Stock.builder().symbol("096770.KS").name("SK이노베이션").market("KOSPI").sector("에너지").build(),
                    Stock.builder().symbol("033780.KS").name("KT&G").market("KOSPI").sector("담배·식품").build(),
                    // ── KOSPI 추가 ────────────────────────────────────────
                    // 전자/반도체/IT
                    Stock.builder().symbol("009150.KS").name("삼성전기").market("KOSPI").sector("전자부품").build(),
                    Stock.builder().symbol("011070.KS").name("LG이노텍").market("KOSPI").sector("전자부품").build(),
                    Stock.builder().symbol("042700.KS").name("한미반도체").market("KOSPI").sector("반도체장비").build(),
                    Stock.builder().symbol("000990.KS").name("DB하이텍").market("KOSPI").sector("반도체").build(),
                    Stock.builder().symbol("018260.KS").name("삼성SDS").market("KOSPI").sector("IT서비스").build(),
                    Stock.builder().symbol("036570.KS").name("NC소프트").market("KOSPI").sector("게임").build(),
                    Stock.builder().symbol("251270.KS").name("넷마블").market("KOSPI").sector("게임").build(),
                    Stock.builder().symbol("035760.KS").name("CJ ENM").market("KOSPI").sector("미디어·콘텐츠").build(),
                    // 자동차/부품
                    Stock.builder().symbol("064350.KS").name("현대로템").market("KOSPI").sector("방산·철도").build(),
                    Stock.builder().symbol("086280.KS").name("현대글로비스").market("KOSPI").sector("물류").build(),
                    Stock.builder().symbol("011210.KS").name("현대위아").market("KOSPI").sector("자동차부품").build(),
                    Stock.builder().symbol("018880.KS").name("한온시스템").market("KOSPI").sector("자동차부품").build(),
                    Stock.builder().symbol("204320.KS").name("만도").market("KOSPI").sector("자동차부품").build(),
                    Stock.builder().symbol("161390.KS").name("한국타이어앤테크놀로지").market("KOSPI").sector("타이어").build(),
                    Stock.builder().symbol("002350.KS").name("넥센타이어").market("KOSPI").sector("타이어").build(),
                    Stock.builder().symbol("012450.KS").name("한화에어로스페이스").market("KOSPI").sector("방산·항공우주").build(),
                    // 금융/보험
                    Stock.builder().symbol("316140.KS").name("우리금융지주").market("KOSPI").sector("금융").build(),
                    Stock.builder().symbol("071050.KS").name("한국금융지주").market("KOSPI").sector("금융").build(),
                    Stock.builder().symbol("024110.KS").name("IBK기업은행").market("KOSPI").sector("금융").build(),
                    Stock.builder().symbol("006800.KS").name("미래에셋증권").market("KOSPI").sector("증권").build(),
                    Stock.builder().symbol("016360.KS").name("삼성증권").market("KOSPI").sector("증권").build(),
                    Stock.builder().symbol("088350.KS").name("한화생명").market("KOSPI").sector("보험").build(),
                    Stock.builder().symbol("000810.KS").name("삼성화재").market("KOSPI").sector("보험").build(),
                    Stock.builder().symbol("005830.KS").name("DB손해보험").market("KOSPI").sector("보험").build(),
                    Stock.builder().symbol("001450.KS").name("현대해상").market("KOSPI").sector("보험").build(),
                    Stock.builder().symbol("029780.KS").name("삼성카드").market("KOSPI").sector("금융").build(),
                    Stock.builder().symbol("138040.KS").name("메리츠금융지주").market("KOSPI").sector("금융").build(),
                    // 에너지/화학
                    Stock.builder().symbol("010950.KS").name("S-Oil").market("KOSPI").sector("에너지·정유").build(),
                    Stock.builder().symbol("009830.KS").name("한화솔루션").market("KOSPI").sector("에너지·화학").build(),
                    Stock.builder().symbol("011170.KS").name("롯데케미칼").market("KOSPI").sector("화학").build(),
                    Stock.builder().symbol("010060.KS").name("OCI홀딩스").market("KOSPI").sector("화학").build(),
                    Stock.builder().symbol("011780.KS").name("금호석유화학").market("KOSPI").sector("화학").build(),
                    Stock.builder().symbol("002380.KS").name("KCC").market("KOSPI").sector("건자재·화학").build(),
                    Stock.builder().symbol("004800.KS").name("효성").market("KOSPI").sector("화학·섬유").build(),
                    Stock.builder().symbol("003600.KS").name("SK케미칼").market("KOSPI").sector("화학·바이오").build(),
                    // 철강/소재
                    Stock.builder().symbol("004020.KS").name("현대제철").market("KOSPI").sector("철강").build(),
                    Stock.builder().symbol("010120.KS").name("LS ELECTRIC").market("KOSPI").sector("전기기기").build(),
                    Stock.builder().symbol("006260.KS").name("LS").market("KOSPI").sector("전선·소재").build(),
                    Stock.builder().symbol("010130.KS").name("고려아연").market("KOSPI").sector("비철금속").build(),
                    Stock.builder().symbol("000670.KS").name("영풍").market("KOSPI").sector("비철금속").build(),
                    // 제약/바이오
                    Stock.builder().symbol("000100.KS").name("유한양행").market("KOSPI").sector("제약").build(),
                    Stock.builder().symbol("128940.KS").name("한미약품").market("KOSPI").sector("제약").build(),
                    Stock.builder().symbol("326030.KS").name("SK바이오팜").market("KOSPI").sector("바이오").build(),
                    Stock.builder().symbol("302440.KS").name("SK바이오사이언스").market("KOSPI").sector("바이오").build(),
                    Stock.builder().symbol("008930.KS").name("한미사이언스").market("KOSPI").sector("제약").build(),
                    Stock.builder().symbol("009420.KS").name("한올바이오파마").market("KOSPI").sector("바이오").build(),
                    Stock.builder().symbol("170900.KS").name("동아쏘시오홀딩스").market("KOSPI").sector("제약").build(),
                    Stock.builder().symbol("185750.KS").name("종근당").market("KOSPI").sector("제약").build(),
                    // 통신
                    Stock.builder().symbol("032640.KS").name("LG유플러스").market("KOSPI").sector("통신").build(),
                    // 건설/중공업
                    Stock.builder().symbol("000720.KS").name("현대건설").market("KOSPI").sector("건설").build(),
                    Stock.builder().symbol("006360.KS").name("GS건설").market("KOSPI").sector("건설").build(),
                    Stock.builder().symbol("294870.KS").name("HDC현대산업개발").market("KOSPI").sector("건설").build(),
                    Stock.builder().symbol("034020.KS").name("두산에너빌리티").market("KOSPI").sector("중공업").build(),
                    Stock.builder().symbol("028050.KS").name("삼성E&A").market("KOSPI").sector("EPC").build(),
                    Stock.builder().symbol("047040.KS").name("대우건설").market("KOSPI").sector("건설").build(),
                    Stock.builder().symbol("012630.KS").name("HDC").market("KOSPI").sector("지주").build(),
                    Stock.builder().symbol("000210.KS").name("DL").market("KOSPI").sector("지주·건설").build(),
                    // 유통/식음료/소비재
                    Stock.builder().symbol("139480.KS").name("이마트").market("KOSPI").sector("유통").build(),
                    Stock.builder().symbol("023530.KS").name("롯데쇼핑").market("KOSPI").sector("유통").build(),
                    Stock.builder().symbol("004170.KS").name("신세계").market("KOSPI").sector("유통").build(),
                    Stock.builder().symbol("097950.KS").name("CJ제일제당").market("KOSPI").sector("식품").build(),
                    Stock.builder().symbol("004370.KS").name("농심").market("KOSPI").sector("식품").build(),
                    Stock.builder().symbol("003230.KS").name("삼양식품").market("KOSPI").sector("식품").build(),
                    Stock.builder().symbol("005180.KS").name("빙그레").market("KOSPI").sector("식품").build(),
                    Stock.builder().symbol("001680.KS").name("대상").market("KOSPI").sector("식품").build(),
                    Stock.builder().symbol("271560.KS").name("오리온").market("KOSPI").sector("식품").build(),
                    Stock.builder().symbol("069960.KS").name("현대백화점").market("KOSPI").sector("유통").build(),
                    Stock.builder().symbol("008770.KS").name("호텔신라").market("KOSPI").sector("면세·호텔").build(),
                    Stock.builder().symbol("007070.KS").name("GS리테일").market("KOSPI").sector("유통").build(),
                    Stock.builder().symbol("000120.KS").name("CJ대한통운").market("KOSPI").sector("물류").build(),
                    Stock.builder().symbol("021240.KS").name("코웨이").market("KOSPI").sector("생활가전").build(),
                    Stock.builder().symbol("000080.KS").name("하이트진로").market("KOSPI").sector("주류").build(),
                    Stock.builder().symbol("005300.KS").name("롯데칠성음료").market("KOSPI").sector("음료").build(),
                    Stock.builder().symbol("090430.KS").name("아모레퍼시픽").market("KOSPI").sector("화장품").build(),
                    Stock.builder().symbol("002790.KS").name("아모레G").market("KOSPI").sector("지주").build(),
                    // 조선/해운
                    Stock.builder().symbol("009540.KS").name("한국조선해양").market("KOSPI").sector("조선").build(),
                    Stock.builder().symbol("042660.KS").name("한화오션").market("KOSPI").sector("조선").build(),
                    Stock.builder().symbol("010620.KS").name("현대미포조선").market("KOSPI").sector("조선").build(),
                    Stock.builder().symbol("011200.KS").name("HMM").market("KOSPI").sector("해운").build(),
                    // 지주/대기업
                    Stock.builder().symbol("003550.KS").name("LG").market("KOSPI").sector("지주").build(),
                    Stock.builder().symbol("034730.KS").name("SK").market("KOSPI").sector("지주").build(),
                    Stock.builder().symbol("000880.KS").name("한화").market("KOSPI").sector("지주").build(),
                    Stock.builder().symbol("001040.KS").name("CJ").market("KOSPI").sector("지주").build(),
                    Stock.builder().symbol("078930.KS").name("GS").market("KOSPI").sector("지주").build(),
                    Stock.builder().symbol("047050.KS").name("포스코인터내셔널").market("KOSPI").sector("무역").build(),
                    Stock.builder().symbol("004990.KS").name("롯데지주").market("KOSPI").sector("지주").build(),
                    Stock.builder().symbol("001740.KS").name("SK네트웍스").market("KOSPI").sector("유통").build(),
                    // 공기업/유틸리티
                    Stock.builder().symbol("007340.KS").name("강원랜드").market("KOSPI").sector("카지노").build(),
                    Stock.builder().symbol("036460.KS").name("한국가스공사").market("KOSPI").sector("에너지").build(),
                    Stock.builder().symbol("015760.KS").name("한국전력").market("KOSPI").sector("전력").build(),
                    // 기계/기타
                    Stock.builder().symbol("017800.KS").name("현대엘리베이터").market("KOSPI").sector("기계").build(),
                    Stock.builder().symbol("112610.KS").name("씨에스윈드").market("KOSPI").sector("풍력").build(),
                    Stock.builder().symbol("009450.KS").name("경동나비엔").market("KOSPI").sector("보일러").build(),
                    // ── KOSPI 추가2 ───────────────────────────────────────
                    // 디스플레이/반도체
                    Stock.builder().symbol("034220.KS").name("LG디스플레이").market("KOSPI").sector("디스플레이").build(),
                    Stock.builder().symbol("010140.KS").name("삼성중공업").market("KOSPI").sector("조선").build(),
                    Stock.builder().symbol("047810.KS").name("한국항공우주").market("KOSPI").sector("방산·항공").build(),
                    Stock.builder().symbol("011790.KS").name("SKC").market("KOSPI").sector("화학·소재").build(),
                    // 증권/금융
                    Stock.builder().symbol("039490.KS").name("키움증권").market("KOSPI").sector("증권").build(),
                    Stock.builder().symbol("003540.KS").name("대신증권").market("KOSPI").sector("증권").build(),
                    Stock.builder().symbol("030000.KS").name("제일기획").market("KOSPI").sector("광고").build(),
                    Stock.builder().symbol("003690.KS").name("코리안리").market("KOSPI").sector("재보험").build(),
                    // 지주/대기업
                    Stock.builder().symbol("000150.KS").name("두산").market("KOSPI").sector("지주").build(),
                    Stock.builder().symbol("009780.KS").name("영원무역홀딩스").market("KOSPI").sector("의류").build(),
                    // 유통/소비재
                    Stock.builder().symbol("282330.KS").name("BGF리테일").market("KOSPI").sector("편의점").build(),
                    Stock.builder().symbol("009240.KS").name("한샘").market("KOSPI").sector("가구").build(),
                    Stock.builder().symbol("105630.KS").name("한세실업").market("KOSPI").sector("의류·OEM").build(),
                    // 에너지/소재
                    Stock.builder().symbol("018670.KS").name("SK가스").market("KOSPI").sector("에너지").build(),
                    Stock.builder().symbol("014680.KS").name("한솔케미칼").market("KOSPI").sector("화학").build(),
                    Stock.builder().symbol("006040.KS").name("동원산업").market("KOSPI").sector("수산·식품").build(),
                    Stock.builder().symbol("100220.KS").name("한화손해보험").market("KOSPI").sector("보험").build(),
                    // 방산/중공업/조선
                    Stock.builder().symbol("329180.KS").name("HD현대중공업").market("KOSPI").sector("조선").build(),
                    Stock.builder().symbol("267250.KS").name("HD현대").market("KOSPI").sector("지주·조선").build(),
                    Stock.builder().symbol("097230.KS").name("한진").market("KOSPI").sector("물류").build(),
                    Stock.builder().symbol("180640.KS").name("한진칼").market("KOSPI").sector("항공지주").build(),
                    // ── KOSDAQ ────────────────────────────────────────────
                    Stock.builder().symbol("247540.KQ").name("에코프로비엠").market("KOSDAQ").sector("2차전지소재").build(),
                    Stock.builder().symbol("086520.KQ").name("에코프로").market("KOSDAQ").sector("2차전지소재").build(),
                    Stock.builder().symbol("196170.KQ").name("알테오젠").market("KOSDAQ").sector("바이오").build(),
                    Stock.builder().symbol("091990.KQ").name("셀트리온헬스케어").market("KOSDAQ").sector("바이오").build(),
                    Stock.builder().symbol("041510.KQ").name("SM엔터테인먼트").market("KOSDAQ").sector("엔터").build(),
                    Stock.builder().symbol("035900.KQ").name("JYP Ent.").market("KOSDAQ").sector("엔터").build(),
                    Stock.builder().symbol("122870.KQ").name("와이지엔터테인먼트").market("KOSDAQ").sector("엔터").build(),
                    Stock.builder().symbol("357780.KQ").name("솔브레인").market("KOSDAQ").sector("반도체소재").build(),
                    Stock.builder().symbol("293490.KQ").name("카카오게임즈").market("KOSDAQ").sector("게임").build(),
                    Stock.builder().symbol("263750.KQ").name("펄어비스").market("KOSDAQ").sector("게임").build(),
                    Stock.builder().symbol("112040.KQ").name("위메이드").market("KOSDAQ").sector("게임").build(),
                    Stock.builder().symbol("053800.KQ").name("안랩").market("KOSDAQ").sector("보안").build(),
                    Stock.builder().symbol("028300.KQ").name("HLB").market("KOSDAQ").sector("바이오").build(),
                    Stock.builder().symbol("145020.KQ").name("휴젤").market("KOSDAQ").sector("의료·바이오").build(),
                    Stock.builder().symbol("214150.KQ").name("클래시스").market("KOSDAQ").sector("의료기기").build(),
                    Stock.builder().symbol("039030.KQ").name("이오테크닉스").market("KOSDAQ").sector("반도체장비").build(),
                    Stock.builder().symbol("078340.KQ").name("컴투스").market("KOSDAQ").sector("게임").build(),
                    Stock.builder().symbol("095660.KQ").name("네오위즈").market("KOSDAQ").sector("게임").build(),
                    Stock.builder().symbol("091810.KQ").name("티웨이항공").market("KOSDAQ").sector("항공").build(),
                    Stock.builder().symbol("034230.KQ").name("파라다이스").market("KOSDAQ").sector("카지노").build(),
                    Stock.builder().symbol("048260.KQ").name("오스템임플란트").market("KOSDAQ").sector("치과").build(),
                    Stock.builder().symbol("041830.KQ").name("인바디").market("KOSDAQ").sector("의료기기").build(),
                    Stock.builder().symbol("066970.KQ").name("엘앤에프").market("KOSDAQ").sector("2차전지소재").build(),
                    Stock.builder().symbol("068760.KQ").name("셀트리온제약").market("KOSDAQ").sector("제약").build(),
                    Stock.builder().symbol("078600.KQ").name("대주전자재료").market("KOSDAQ").sector("2차전지소재").build(),
                    Stock.builder().symbol("067310.KQ").name("하나마이크론").market("KOSDAQ").sector("반도체패키징").build(),
                    Stock.builder().symbol("046080.KQ").name("웹젠").market("KOSDAQ").sector("게임").build(),
                    // KOSDAQ 추가 ──────────────────────────────────────────
                    // 반도체/IT
                    Stock.builder().symbol("403870.KQ").name("HPSP").market("KOSDAQ").sector("반도체장비").build(),
                    Stock.builder().symbol("336260.KQ").name("두산퓨얼셀").market("KOSDAQ").sector("수소에너지").build(),
                    Stock.builder().symbol("267260.KQ").name("HD현대일렉트릭").market("KOSDAQ").sector("전기기기").build(),
                    Stock.builder().symbol("131970.KQ").name("두산테스나").market("KOSDAQ").sector("반도체").build(),
                    Stock.builder().symbol("237690.KQ").name("에스티팜").market("KOSDAQ").sector("바이오").build(),
                    Stock.builder().symbol("950160.KQ").name("코오롱티슈진").market("KOSDAQ").sector("바이오").build(),
                    Stock.builder().symbol("278280.KQ").name("천보").market("KOSDAQ").sector("2차전지소재").build(),
                    Stock.builder().symbol("222080.KQ").name("씨아이에스").market("KOSDAQ").sector("2차전지장비").build(),
                    Stock.builder().symbol("064760.KQ").name("티씨케이").market("KOSDAQ").sector("반도체소재").build(),
                    Stock.builder().symbol("240810.KQ").name("원익IPS").market("KOSDAQ").sector("반도체장비").build(),
                    Stock.builder().symbol("089150.KQ").name("케이씨텍").market("KOSDAQ").sector("반도체장비").build(),
                    Stock.builder().symbol("036490.KQ").name("SK머티리얼즈").market("KOSDAQ").sector("반도체소재").build(),
                    Stock.builder().symbol("045300.KQ").name("성호전자").market("KOSDAQ").sector("전자부품").build(),
                    Stock.builder().symbol("058470.KQ").name("리노공업").market("KOSDAQ").sector("반도체소재").build(),
                    Stock.builder().symbol("095340.KQ").name("ISC").market("KOSDAQ").sector("반도체패키징").build(),
                    Stock.builder().symbol("121550.KQ").name("비에이치").market("KOSDAQ").sector("전자부품").build(),
                    Stock.builder().symbol("039440.KQ").name("에스티아이").market("KOSDAQ").sector("반도체장비").build(),
                    Stock.builder().symbol("054450.KQ").name("텔레칩스").market("KOSDAQ").sector("반도체").build(),
                    Stock.builder().symbol("160980.KQ").name("싸이맥스").market("KOSDAQ").sector("반도체장비").build(),
                    Stock.builder().symbol("053610.KQ").name("프로텍").market("KOSDAQ").sector("반도체장비").build(),
                    Stock.builder().symbol("036830.KQ").name("솔브레인홀딩스").market("KOSDAQ").sector("반도체소재").build(),
                    // 바이오/헬스케어
                    Stock.builder().symbol("226950.KQ").name("올릭스").market("KOSDAQ").sector("바이오").build(),
                    Stock.builder().symbol("141080.KQ").name("레고켐바이오").market("KOSDAQ").sector("바이오").build(),
                    Stock.builder().symbol("084990.KQ").name("헬릭스미스").market("KOSDAQ").sector("바이오").build(),
                    Stock.builder().symbol("200780.KQ").name("진원생명과학").market("KOSDAQ").sector("바이오").build(),
                    Stock.builder().symbol("086900.KQ").name("메디오젠").market("KOSDAQ").sector("바이오").build(),
                    Stock.builder().symbol("236810.KQ").name("엔에스엔").market("KOSDAQ").sector("의료기기").build(),
                    Stock.builder().symbol("214370.KQ").name("케어젠").market("KOSDAQ").sector("의료·바이오").build(),
                    Stock.builder().symbol("115180.KQ").name("큐리언트").market("KOSDAQ").sector("바이오").build(),
                    Stock.builder().symbol("950200.KQ").name("파마리서치").market("KOSDAQ").sector("바이오").build(),
                    Stock.builder().symbol("187220.KQ").name("디알텍").market("KOSDAQ").sector("의료기기").build(),
                    Stock.builder().symbol("310210.KQ").name("보로노이").market("KOSDAQ").sector("바이오").build(),
                    Stock.builder().symbol("085660.KQ").name("차바이오텍").market("KOSDAQ").sector("바이오").build(),
                    Stock.builder().symbol("088980.KQ").name("마크로젠").market("KOSDAQ").sector("유전체분석").build(),
                    Stock.builder().symbol("019540.KQ").name("제이브이엠").market("KOSDAQ").sector("의료기기").build(),
                    Stock.builder().symbol("060280.KQ").name("큐렉소").market("KOSDAQ").sector("의료로봇").build(),
                    // IT/플랫폼/콘텐츠
                    Stock.builder().symbol("033290.KQ").name("코웰패션").market("KOSDAQ").sector("패션").build(),
                    Stock.builder().symbol("217270.KQ").name("넵튠").market("KOSDAQ").sector("게임").build(),
                    Stock.builder().symbol("069080.KQ").name("웹케시").market("KOSDAQ").sector("핀테크").build(),
                    Stock.builder().symbol("225570.KQ").name("넥슨게임즈").market("KOSDAQ").sector("게임").build(),
                    Stock.builder().symbol("101730.KQ").name("위메이드맥스").market("KOSDAQ").sector("게임").build(),
                    Stock.builder().symbol("192400.KQ").name("쿠쿠홀딩스").market("KOSDAQ").sector("가전").build(),
                    Stock.builder().symbol("052300.KQ").name("더존비즈온").market("KOSDAQ").sector("IT서비스").build(),
                    Stock.builder().symbol("064440.KQ").name("이스트소프트").market("KOSDAQ").sector("IT·AI").build(),
                    Stock.builder().symbol("039420.KQ").name("사람인에이치알").market("KOSDAQ").sector("IT서비스").build(),
                    Stock.builder().symbol("024770.KQ").name("키다리스튜디오").market("KOSDAQ").sector("웹툰·콘텐츠").build(),
                    // EV/2차전지
                    Stock.builder().symbol("459190.KQ").name("에코앤드림").market("KOSDAQ").sector("2차전지소재").build(),
                    Stock.builder().symbol("272290.KQ").name("이엔드디").market("KOSDAQ").sector("2차전지소재").build(),
                    Stock.builder().symbol("307950.KQ").name("현대오토에버").market("KOSDAQ").sector("IT서비스").build(),
                    Stock.builder().symbol("099440.KQ").name("스맥").market("KOSDAQ").sector("2차전지장비").build(),
                    Stock.builder().symbol("107640.KQ").name("한중엔시에스").market("KOSDAQ").sector("2차전지장비").build(),
                    // 방산/항공우주
                    Stock.builder().symbol("272210.KQ").name("한화시스템").market("KOSDAQ").sector("방산").build(),
                    Stock.builder().symbol("082740.KQ").name("HSD엔진").market("KOSDAQ").sector("조선엔진").build(),
                    // ── NASDAQ ────────────────────────────────────────────
                    Stock.builder().symbol("AAPL").name("Apple").market("NASDAQ").sector("소비자전자").build(),
                    Stock.builder().symbol("MSFT").name("Microsoft").market("NASDAQ").sector("소프트웨어").build(),
                    Stock.builder().symbol("NVDA").name("NVIDIA").market("NASDAQ").sector("반도체").build(),
                    Stock.builder().symbol("GOOGL").name("Alphabet").market("NASDAQ").sector("인터넷").build(),
                    Stock.builder().symbol("META").name("Meta Platforms").market("NASDAQ").sector("소셜미디어").build(),
                    Stock.builder().symbol("AMZN").name("Amazon").market("NASDAQ").sector("e-커머스").build(),
                    Stock.builder().symbol("TSLA").name("Tesla").market("NASDAQ").sector("전기차").build(),
                    Stock.builder().symbol("AVGO").name("Broadcom").market("NASDAQ").sector("반도체").build(),
                    Stock.builder().symbol("NFLX").name("Netflix").market("NASDAQ").sector("스트리밍").build(),
                    Stock.builder().symbol("AMD").name("AMD").market("NASDAQ").sector("반도체").build(),
                    // ── NYSE ──────────────────────────────────────────────
                    Stock.builder().symbol("JPM").name("JPMorgan Chase").market("NYSE").sector("금융").build(),
                    Stock.builder().symbol("V").name("Visa").market("NYSE").sector("금융결제").build(),
                    Stock.builder().symbol("WMT").name("Walmart").market("NYSE").sector("유통").build(),
                    Stock.builder().symbol("XOM").name("ExxonMobil").market("NYSE").sector("에너지").build(),
                    Stock.builder().symbol("JNJ").name("Johnson & Johnson").market("NYSE").sector("헬스케어").build(),
                    Stock.builder().symbol("UNH").name("UnitedHealth").market("NYSE").sector("헬스케어").build(),
                    Stock.builder().symbol("HD").name("Home Depot").market("NYSE").sector("유통").build(),
                    Stock.builder().symbol("BAC").name("Bank of America").market("NYSE").sector("금융").build(),
                    Stock.builder().symbol("KO").name("Coca-Cola").market("NYSE").sector("음료").build(),
                    Stock.builder().symbol("MRK").name("Merck").market("NYSE").sector("제약").build()
            );

            stocks.forEach(stock -> {
                if (!stockRepository.existsBySymbol(stock.getSymbol())) {
                    stockRepository.save(stock);
                    log.info("Initialized stock: {}", stock.getSymbol());
                }
            });

            // 시작 시 즉시 가격 수집 + 분석 실행 (스케줄러 첫 실행 전에 데이터 확보)
            log.info("Starting initial price collection...");
            try {
                stockDataCollector.collectAll();
                stockAnalysisService.analyzeAll();
                log.info("Initial price collection and analysis completed.");
            } catch (Exception e) {
                log.warn("Initial collection failed (non-fatal): {}", e.getMessage());
            }

            // 30일치 일봉 데이터 백필 (데이터가 부족한 종목만 실행)
            log.info("Starting historical data backfill...");
            try {
                stockDataCollector.backfillAll();
                stockAnalysisService.analyzeAll();
                log.info("Historical backfill completed.");
            } catch (Exception e) {
                log.warn("Backfill failed (non-fatal): {}", e.getMessage());
            }
        };
    }
}
