import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

/** Same-origin client — geen hardcoded baseURL. */
export const authClient = createAuthClient({
  plugins: [adminClient()],
});
