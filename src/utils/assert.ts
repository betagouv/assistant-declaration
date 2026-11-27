import assert from 'assert';

// [WORKAROUND] The normal `assert()` call will be slow without a default message due to reading the source code
// Ref: https://github.com/nodejs/node/issues/52962#issuecomment-2473883051
export function workaroundAssert(value: unknown, message?: string | Error): asserts value {
  // Newer @types/node only accept `Error` (or an assert message function) as second argument
  assert(value, message instanceof Error ? message : new Error(message ?? 'fallback due to slow official assert otherwise'));
}
