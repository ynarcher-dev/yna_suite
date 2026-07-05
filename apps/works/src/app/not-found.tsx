import Link from "next/link";
import { Button, NotFoundScreen } from "@yna/ui";

export default function NotFound() {
  return (
    <NotFoundScreen
      action={
        <Link href="/">
          <Button variant="outline">대시보드로 이동</Button>
        </Link>
      }
    />
  );
}
