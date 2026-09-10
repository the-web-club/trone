import { AsyncLocalStorage } from "node:async_hooks";

export type ResetPasswordMail = {
  name: string;
  email: string;
  url: string;
};

const storage = new AsyncLocalStorage<{ current: ResetPasswordMail | null }>();

export function captureResetPassword(mail: ResetPasswordMail) {
  const store = storage.getStore();
  if (!store) return false;
  store.current = mail;
  return true;
}

export async function withResetPasswordCapture<T>(fn: () => Promise<T>) {
  const store = { current: null as ResetPasswordMail | null };
  const result = await storage.run(store, fn);
  return { result, captured: store.current };
}
