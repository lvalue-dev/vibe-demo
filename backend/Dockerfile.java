# ── Build stage ────────────────────────────────────────────────────────────────
# Java 17 + Gradle 빌드
FROM eclipse-temurin:17-jdk AS builder
WORKDIR /app

# Gradle wrapper 캐시 레이어
COPY gradlew settings.gradle build.gradle ./
COPY gradle ./gradle
RUN chmod +x gradlew && ./gradlew dependencies --no-daemon 2>/dev/null || true

# 소스 빌드
COPY src ./src
RUN ./gradlew bootJar --no-daemon -x test

# ── Runtime stage ──────────────────────────────────────────────────────────────
# JRE only (이미지 경량화)
FROM eclipse-temurin:17-jre
WORKDIR /app

RUN addgroup --system stockguide && adduser --system --ingroup stockguide stockguide

COPY --from=builder /app/build/libs/*.jar app.jar

USER stockguide
EXPOSE 8080

# G1GC, 컨테이너 메모리 제한 인식
ENTRYPOINT ["java", \
  "-XX:+UseG1GC", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-jar", "app.jar"]
