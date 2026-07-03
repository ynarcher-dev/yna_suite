"use client";

import { useActionState } from "react";
import { Button, FormField, Input } from "@yna/ui";
import { signIn, type LoginState } from "./actions";

const INITIAL: LoginState = { error: null };

/** 로그인 폼(클라이언트). 서버 액션 결과의 오류 메시지를 표시한다. */
export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signIn, INITIAL);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <FormField label="이메일" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </FormField>
      <FormField label="비밀번호" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </FormField>
      {state.error ? (
        <p role="alert" className="text-sm text-brand">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "로그인 중…" : "로그인"}
      </Button>
    </form>
  );
}
