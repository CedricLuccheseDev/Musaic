# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Musaic, please report it responsibly:

1. **Do not** open a public issue
2. Contact the maintainer via email or private GitHub issue
3. Provide detailed information:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Response Time

We aim to acknowledge security reports within **48 hours** and provide a fix or mitigation plan within **7 days** for critical issues.

## Supported Versions

Only the latest version on the `main` branch is actively supported with security updates.

## Security Best Practices

When contributing or deploying:
- Never commit API keys, secrets, or credentials
- Use `.env` files for local development (already in `.gitignore`)
- Keep dependencies up to date
- Report suspicious dependencies or behaviors

## License Note

Under AGPL-3.0, any deployment of Musaic (including modified versions) must also comply with security disclosure requirements if the service is made available over a network.
