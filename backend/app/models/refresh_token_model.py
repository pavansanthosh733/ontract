import hashlib
from sqlalchemy.sql import text
from app.models.database import db


class RefreshTokenModel:

    @staticmethod
    def hash_token(token: str):
        return hashlib.sha256(token.encode()).hexdigest()

    @staticmethod
    def save_refresh_token(user_id, role, refresh_token, expires_at):

        token_hash = RefreshTokenModel.hash_token(refresh_token)

        db.session.execute(
            text("""
                INSERT INTO refresh_tokens (user_id,role,refresh_token_hash,expires_at)
                VALUES (:user_id,:role,:refresh_token_hash,:expires_at)
            """),
            {
                "user_id": user_id,
                "role": role,
                "refresh_token_hash": token_hash,
                "expires_at": expires_at
            }
        )

        db.session.commit()

    @staticmethod
    def get_refresh_token(refresh_token):

        token_hash = RefreshTokenModel.hash_token(refresh_token)

        row = db.session.execute(
            text("""
                SELECT * FROM refresh_tokens WHERE refresh_token_hash = :token
                AND revoked = FALSE
            """),
            {
                "token": token_hash
            }
        ).fetchone()

        return dict(row._mapping) if row else None

    @staticmethod
    def revoke_refresh_token(refresh_token):

        token_hash = RefreshTokenModel.hash_token(refresh_token)

        db.session.execute(
            text("""
                UPDATE refresh_tokens SET revoked = TRUE WHERE refresh_token_hash = :token
            """),
            {
                "token": token_hash
            }
        )

        db.session.commit()

    @staticmethod
    def revoke_refresh_token(refresh_token):

        token_hash = RefreshTokenModel.hash_token(refresh_token)

        db.session.execute(
            text("""
                UPDATE refresh_tokens
                SET revoked = TRUE
                WHERE refresh_token_hash = :token
            """),
            {
                "token": token_hash
            }
        )

        db.session.commit()