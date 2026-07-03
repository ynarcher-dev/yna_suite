import { APP_CONFIGS } from "@yna/config";
import { Button } from "@yna/ui";

const app = APP_CONFIGS.hub;

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">{app.appName}</h1>
        <p className="mt-1 text-sm text-neutral-500">{app.host} · Phase 1.1 스캐폴딩 확인용 화면</p>
      </div>
      <p className="text-sm text-neutral-600">
        공통 패키지(@yna/ui, @yna/config)가 앱에 연결되었는지 확인하는 최소 화면입니다. 디자인
        시스템과 AppShell 은 Phase 1.2 에서 구현합니다.
      </p>
      <div className="flex gap-2">
        <Button>기본 버튼</Button>
        <Button variant="secondary">보조 버튼</Button>
      </div>
    </main>
  );
}
