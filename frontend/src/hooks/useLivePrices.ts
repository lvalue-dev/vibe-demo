/**
 * Spring Boot 백엔드는 SSE를 제공하지 않아 no-op으로 유지.
 * 가격 갱신은 React Query의 refetchInterval로 처리됨.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useLivePrices(_symbols: string[] = []) {
  // no-op
}
