package com.stockguide.domain.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class PortfolioRequest {

    @NotBlank
    private String symbol;

    @NotNull
    @DecimalMin("0.01")
    private BigDecimal avgPrice;

    @NotNull
    @Min(1)
    private Integer quantity;
}
