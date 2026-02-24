package com.stockguide.domain.entity;

import com.stockguide.domain.entity.enums.Recommendation;
import com.stockguide.domain.entity.enums.RiskLevel;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "stock_analysis", indexes = {
        @Index(name = "idx_analysis_stock_id_created", columnList = "stock_id, created_at DESC")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stock_id", nullable = false)
    private Stock stock;

    @Column(nullable = false)
    private Integer score; // 0-100

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Recommendation recommendation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private RiskLevel risk;

    @Column(columnDefinition = "TEXT")
    private String reasons; // JSON array stored as text

    // Analysis details
    @Column(name = "current_price", precision = 15, scale = 2)
    private BigDecimal currentPrice;

    @Column(name = "ma5", precision = 15, scale = 2)
    private BigDecimal ma5;

    @Column(name = "ma20", precision = 15, scale = 2)
    private BigDecimal ma20;

    @Column(name = "volume_ratio", precision = 8, scale = 4)
    private BigDecimal volumeRatio; // current vol / avg vol

    @Column(name = "price_change_rate", precision = 8, scale = 4)
    private BigDecimal priceChangeRate; // daily change %

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
