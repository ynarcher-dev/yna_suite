import * as React from "react";
import { Ban, Clock, FileQuestion, ServerCrash } from "lucide-react";
import { StateMessage } from "./state-message";

/**
 * 공통 상태 화면. (근거: yna_suite_information_architecture.md §2, design_system §10)
 *
 * 모두 순수 표현 컴포넌트. 액션(다시 시도/로그인 등)은 앱이 주입한다.
 */

export interface StatusScreenProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

/** 접근 권한 없음. (권한 없는 사용자 차단) */
export function NoPermissionScreen({ title, description, action }: StatusScreenProps) {
  return (
    <StateMessage
      icon={Ban}
      tone="danger"
      title={title ?? "접근 권한이 없습니다"}
      description={description ?? "이 화면을 볼 수 있는 권한이 없습니다. 관리자에게 문의하세요."}
      action={action}
    />
  );
}

/** 세션 만료. (임시 권한/토큰 만료 자동 차단) */
export function SessionExpiredScreen({ title, description, action }: StatusScreenProps) {
  return (
    <StateMessage
      icon={Clock}
      tone="danger"
      title={title ?? "세션이 만료되었습니다"}
      description={description ?? "보안을 위해 다시 로그인해 주세요."}
      action={action}
    />
  );
}

/** 시스템 오류. */
export function SystemErrorScreen({ title, description, action }: StatusScreenProps) {
  return (
    <StateMessage
      icon={ServerCrash}
      tone="danger"
      title={title ?? "문제가 발생했습니다"}
      description={description ?? "잠시 후 다시 시도해 주세요. 문제가 계속되면 관리자에게 문의하세요."}
      action={action}
    />
  );
}

/** 찾을 수 없음(404). */
export function NotFoundScreen({ title, description, action }: StatusScreenProps) {
  return (
    <StateMessage
      icon={FileQuestion}
      title={title ?? "페이지를 찾을 수 없습니다"}
      description={description ?? "요청하신 페이지가 없거나 이동되었습니다."}
      action={action}
    />
  );
}
