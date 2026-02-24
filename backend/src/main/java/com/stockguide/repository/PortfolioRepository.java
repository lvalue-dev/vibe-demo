package com.stockguide.repository;

import com.stockguide.domain.entity.Portfolio;
import com.stockguide.domain.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PortfolioRepository extends JpaRepository<Portfolio, Long> {

    @Query("SELECT p FROM Portfolio p JOIN FETCH p.stock WHERE p.user = :user ORDER BY p.createdAt DESC")
    List<Portfolio> findByUserWithStock(@Param("user") User user);

    Optional<Portfolio> findByUserAndStockSymbol(User user, String symbol);
}
