export const PREVIEW_ROW_CAP = 100;
export const LARGE_FILE_WARN_BYTES = 50 * 1024 * 1024;
/** Max decompressed share payload size when decoding URL hash (gzip bomb guard). */
export const SHARE_DECODE_MAX_BYTES = 512 * 1024;
/** Max base64url-encoded gzip payload length accepted on decode. */
export const SHARE_DECODE_MAX_ENCODED_LENGTH = 128 * 1024;
export const MAX_PROFILE_ROWS = 100_000;
export const WORKFLOW_SCHEMA_VERSION = 1;
export const EXECUTION_DEBOUNCE_MS = 400;
export const PROFILE_FETCH_DEBOUNCE_MS = 150;
export const AUTOSAVE_DEBOUNCE_MS = 2000;
export const AUTO_SNAPSHOT_EDIT_COUNT = 50;
