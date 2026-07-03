/**
 * Supabase 스키마 타입 자리.
 *
 * Phase 1.3(스키마/마이그레이션) 이후 `supabase gen types typescript` 결과로 대체한다.
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
