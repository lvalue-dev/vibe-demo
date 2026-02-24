FROM eclipse-temurin:17-jdk-alpine AS builder
WORKDIR /app
COPY gradlew .
COPY gradle gradle
COPY build.gradle .
COPY settings.gradle .
RUN chmod +x ./gradlew
COPY src src
RUN ./gradlew bootJar -x test --no-daemon

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
RUN addgroup -S stockguide && adduser -S stockguide -G stockguide
COPY --from=builder /app/build/libs/*.jar app.jar
USER stockguide
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
