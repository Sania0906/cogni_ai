/**
 * Safety guard for legacy development-only diagnostic/test scripts under backend/src/config.
 * Prevents accidental execution against production environments or automated admin misuse.
 */
export function assertLegacyDevScriptAllowed(scriptName: string): void {
  const nodeEnv = (process.env.NODE_ENV || "").trim().toLowerCase();
  const isRender = ["true", "1", "yes"].includes((process.env.RENDER || "").trim().toLowerCase());
  const explicitlyAllowed = (process.env.ALLOW_LEGACY_DEV_SCRIPTS || "").trim().toLowerCase() === "true";

  if (nodeEnv === "production" || isRender) {
    console.error(
      `[SECURITY BLOCK] Legacy dev script '${scriptName}' cannot run in production or Render environments.`
    );
    process.exit(1);
  }

  if (!explicitlyAllowed) {
    console.error(
      `[SECURITY BLOCK] Legacy dev script '${scriptName}' requires ALLOW_LEGACY_DEV_SCRIPTS=true in local development.`
    );
    process.exit(1);
  }
}

export function requireEnvCredential(envKey: string, label: string): string {
  const value = (process.env[envKey] || "").trim();
  if (!value) {
    console.error(`[CONFIG ERROR] Required environment variable '${envKey}' (${label}) is not set.`);
    process.exit(1);
  }
  return value;
}

