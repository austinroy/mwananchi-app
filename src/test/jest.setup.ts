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
