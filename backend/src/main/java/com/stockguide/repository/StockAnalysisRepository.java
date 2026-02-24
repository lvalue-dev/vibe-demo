package com.stockguide.repository;

import com.stockguide.domain.entity.Stock;
import com.stockguide.domain.entity.StockAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StockAnalysisRepository extends JpaRepository<StockAnalysis, Long> {
    Optional<StockAnalysis> findTopByStockOrderByCreatedAtDesc(Stock stock);
}
