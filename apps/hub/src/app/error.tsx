"use client";

import { Button, SystemErrorScreen } from "@yna/ui";

/** 라우트 세그먼트 에러 경계. (근거: information_architecture §2 — System Error) */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <SystemErrorScreen action={<Button onClick={reset}>다시 시도</Button>} />
  );
}
