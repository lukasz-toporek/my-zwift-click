/**
 * pkg runtime setup — must be the FIRST import in tray.ts.
 *
 * For noble: node-gyp-build already has a "nearby" fallback that checks
 * path.dirname(process.execPath)/prebuilds/ — the build copies the .node
 * file there, so no extra work is needed here.
 *
 * For koffi: uses a static require() which pkg bundles into the snapshot
 * and handles automatically.
 *
 * This file is a placeholder that keeps the import order guarantee (it must
 * run before any native addon imports) without doing anything at runtime.
 */

// intentionally empty at runtime
export {};
