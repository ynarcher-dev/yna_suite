/**
 * Supabase 스키마 타입 자리.
 *
 * Phase 1.3 에서 `supabase/migrations` 에 hub/dev 우선순위1 테이블을 생성했다.
 * 실제 타입은 `supabase gen types typescript --local`(또는 원격) 결과로 대체하는데,
 * 이는 로컬 Postgres(Docker) 또는 원격 적용이 필요하다. 현재 개발 환경은 Docker 미설치라
 * 스키마를 적용/생성하지 못해 gen types 를 아직 실행하지 못했다(진행 기록 참고).
 * 그때까지는 최소 형태만 두어 client 제네릭을 연결한다.
 */
export interface Database {
  // 생성 전 placeholder. 실제 스키마는 supabase/migrations 기준으로 생성된다.
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
