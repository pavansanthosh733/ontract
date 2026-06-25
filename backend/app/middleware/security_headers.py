from flask import request


def register_security_headers(app):
    """
    Register OWASP recommended security headers.

    Applied globally to every HTTP response for more security.
    """

    @app.after_request
    def add_security_headers(response):
        print("✅ Security headers middleware executed")
        print("✅ Security Headers Middleware Executed")
        # ------------------------------------------------------------------
        # Prevent MIME-type sniffing
        # ------------------------------------------------------------------
        response.headers["X-Content-Type-Options"] = "nosniff"

        # ------------------------------------------------------------------
        # Prevent Clickjacking
        # ------------------------------------------------------------------
        response.headers["X-Frame-Options"] = "DENY"

        # ------------------------------------------------------------------
        # Reduce Referer leakage
        # ------------------------------------------------------------------
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # ------------------------------------------------------------------
        # Disable unnecessary browser APIs
        # ------------------------------------------------------------------
        response.headers["Permissions-Policy"] = (
            "camera=(), "
            "microphone=(), "
            "geolocation=(), "
            "payment=(), "
            "usb=()"
        )

        # ------------------------------------------------------------------
        # Cross-Origin Protection
        # ------------------------------------------------------------------
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
        response.headers["Cross-Origin-Resource-Policy"] = "same-origin"

        # ------------------------------------------------------------------
        # HTTP Strict Transport Security
        # Only enable over HTTPS
        # ------------------------------------------------------------------
        if request.is_secure:
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )

        # ------------------------------------------------------------------
        # Content Security Policy
        # ------------------------------------------------------------------
        csp = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: blob:; "
            "font-src 'self' data:; "
            "connect-src 'self' https: wss:; "
            "frame-ancestors 'none'; "
            "object-src 'none'; "
            "base-uri 'self'; "
            "form-action 'self'; "
            "upgrade-insecure-requests;"
        )

        response.headers["Content-Security-Policy"] = csp

        return response