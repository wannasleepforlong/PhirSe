import "server-only";
import { cookies } from "next/headers";
import { parseMode, UI_COOKIE, type UiMode } from "./dict";

export async function uiMode(): Promise<UiMode> {
  return parseMode((await cookies()).get(UI_COOKIE)?.value);
}
