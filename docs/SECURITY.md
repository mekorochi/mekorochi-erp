# MEKOROCHI ERP — Security Documentation

## Authentication
- Session-based auth with HTTP-only, secure, SameSite=Lax cookies
- Passwords hashed with bcrypt (12 rounds)
- Session tokens are UUIDv4, stored in database with expiry (7 days)
- Middleware redirects unauthenticated users to /login
- API endpoints return 401 for missing sessions

## Authorization
- Role-Based Access Control (RBAC) with 7 built-in roles
- Permissions checked server-side on every action via `requirePermission()`
- Custom roles with granular JSON permission overrides
- UI elements conditionally rendered based on role, but server enforcement is primary

## Data Protection
- All form inputs validated with Zod on the server
- Prisma parameterized queries prevent SQL injection
- File uploads: validated type/size, sanitized filenames, stored outside web root
- CSRF protection via SameSite cookies and form-based mutations
- No secrets in source control (env file pattern)

## Infrastructure
- PostgreSQL not exposed to public network (Docker internal only)
- Caddy reverse proxy with automatic HTTPS and security headers
- Non-root container user for the application
- X-Frame-Options: DENY, X-Content-Type-Options: nosniff
- Rate limiting should be added via Caddy or application middleware in production

## Financial Data Integrity
- Invoices become immutable after posting (snapshot stored)
- Stock movements are append-only (never deleted)
- Audit log tracks all sensitive operations with before/after state
- Database transactions for multi-step operations (stock + payment + order updates)

## Recommendations for Production
1. Generate a strong AUTH_SECRET (minimum 32 characters random)
2. Set strong DB_PASSWORD
3. Enable HTTPS via Caddy with a real domain
4. Configure regular backup verification
5. Set up monitoring and alerting
6. Review Caddy rate limiting configuration
7. Consider TOTP 2FA for admin accounts
8. Run `npm audit` periodically
9. Keep Node.js, PostgreSQL, and dependencies updated
