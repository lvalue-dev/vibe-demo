package com.stockguide.repository;

import com.stockguide.domain.entity.User;
import com.stockguide.domain.entity.Watchlist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WatchlistRepository extends JpaRepository<Watchlist, Long> {

    @Query("SELECT w FROM Watchlist w JOIN FETCH w.stock WHERE w.user = :user ORDER BY w.createdAt DESC")
    List<Watchlist> findByUserWithStock(@Param("user") User user);

    Optional<Watchlist> findByUserAndStockSymbol(User user, String symbol);

    boolean existsByUserAndStockSymbol(User user, String symbol);
}
