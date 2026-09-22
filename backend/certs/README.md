# Supabase database CA

`supabase-root-2021.crt` is a **public CA certificate**, not a credential or private key.

Downloaded September 18, 2026 from [Supabase's official certificate distribution](https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt). The URL is specified by [Supabase Studio's certificate configuration](https://github.com/supabase/supabase/blob/master/apps/studio/hooks/custom-content/custom-content.json).

SHA-256 fingerprint: `80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`.

Expiry: April 26, 2031. Review the provider's current certificate before renewal or CA rotation.

## Python 3.13 compatibility

The observed session-pooler chain uses Supabase Intermediate 2021 CA, which omits the X.509 keyUsage extension. Python 3.13's new `VERIFY_X509_STRICT` default rejects this chain. OpenSSL reproduces error 92 with `-x509_strict`; the same CA and hostname verify successfully without that flag.

Only the hosted database configuration sets `database_tls_strict: false`. Certificate-chain signatures, certificate validity, trusted CA anchoring, and hostname checks remain enabled (`CERT_REQUIRED`, `check_hostname=True`). Auth HTTPS and the default database configuration retain their normal verification settings. This compatibility exception should be removed when Supabase serves a strict-compatible chain.

See [Python 3.13 SSL changes](https://docs.python.org/3.13/whatsnew/3.13.html#ssl) and [Supabase TLS documentation](https://supabase.com/docs/guides/platform/ssl-enforcement).
