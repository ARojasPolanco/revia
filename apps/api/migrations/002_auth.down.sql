DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS email_verification_tokens;
DROP TABLE IF EXISTS auth_identities;

ALTER TABLE users
  DROP COLUMN IF EXISTS password_changed_at,
  DROP COLUMN IF EXISTS onboarding_completed,
  DROP COLUMN IF EXISTS email_verified_at,
  DROP COLUMN IF EXISTS kyc_status,
  DROP COLUMN IF EXISTS avatar_url,
  DROP COLUMN IF EXISTS location,
  DROP COLUMN IF EXISTS bio;
