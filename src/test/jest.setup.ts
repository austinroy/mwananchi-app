// Jest setup: polyfills for jsdom/node differences
// Provide TextEncoder/TextDecoder which some dependencies expect.
import { TextEncoder, TextDecoder } from "util";

// attach to global if missing
if (typeof (global as any).TextEncoder === "undefined") {
  (global as any).TextEncoder = TextEncoder;
}

if (typeof (global as any).TextDecoder === "undefined") {
  (global as any).TextDecoder = TextDecoder;
}

// Provide a light-weight mock for @tanstack/react-router used in components during tests.
// This avoids needing a full RouterProvider when unit-testing isolated components.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require("react");
  if (typeof jest !== "undefined" && jest && jest.mock) {
    jest.mock("@tanstack/react-router", () => ({
      Link: ({ children, ...props }: any) =>
        React.createElement("a", { href: props.to ?? props.href ?? "#", ...props }, children),
      Outlet: () => null,
      useNavigate: () => jest.fn(),
      useLinkProps: () => ({}),
      useRouter: () => ({}),
    }));
  }
} catch {
  // ignore in environments without jest/require
}
