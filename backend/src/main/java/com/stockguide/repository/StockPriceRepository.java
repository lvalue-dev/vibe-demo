package com.stockguide.repository;

import com.stockguide.domain.entity.Stock;
import com.stockguide.domain.entity.StockPrice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface StockPriceRepository extends JpaRepository<StockPrice, Long> {

    Optional<StockPrice> findTopByStockOrderByTimestampDesc(Stock stock);

    @Query("SELECT sp FROM StockPrice sp WHERE sp.stock = :stock AND sp.timestamp >= :since ORDER BY sp.timestamp ASC")
    List<StockPrice> findByStockAndTimestampAfter(
            @Param("stock") Stock stock,
            @Param("since") LocalDateTime since
    );

    @Query("SELECT sp FROM StockPrice sp WHERE sp.stock = :stock ORDER BY sp.timestamp DESC LIMIT :limit")
    List<StockPrice> findLatestByStock(
            @Param("stock") Stock stock,
            @Param("limit") int limit
    );

    @Query("SELECT AVG(sp.volume) FROM StockPrice sp WHERE sp.stock = :stock AND sp.timestamp >= :since")
    Double findAverageVolumeSince(@Param("stock") Stock stock, @Param("since") LocalDateTime since);
}
