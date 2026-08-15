# Security Policy

## 🔒 Security Architecture

Chuchudu is engineered as a **Zero-Knowledge, End-to-End Encrypted Personal Vault**. Your files, encryption keys, and unencrypted file contents are never readable by anyone other than your authorized devices.

### Cryptographic Standards
- **Cipher Suite**: AES-256-GCM (Galois/Counter Mode) with NIST-recommended 96-bit unique IVs per chunk.
- **Key Derivation**: PBKDF2 with SHA-256 (600,000 iterations conforming to OWASP specifications).
- **Integrity Verification**: 128-bit authentication tags computed on ciphertext and sequence-bound Additional Authenticated Data (AAD).
- **Zero Cloud Storage Retention**: Transit buffers (Firestore/Google Drive) are transient. Raw chunks are purged immediately upon receipt by your authorized desktop vault.

---

## 🛡️ Reporting a Vulnerability

We take the security and privacy of our users seriously. If you discover a security vulnerability, please disclose it responsibly.

### How to Report:
- **Email**: Send vulnerability reports directly to `security@chuchudu.in` or `masterdanish10@gmail.com`.
- **Response Time**: You will receive an initial response acknowledging your report within 24–48 hours.
- **Resolution**: We will provide a timeline for triage, remediation, and public patch release.

Please **do not** file public GitHub issues for sensitive security vulnerabilities.

Thank you for helping keep the Chuchudu community safe!
