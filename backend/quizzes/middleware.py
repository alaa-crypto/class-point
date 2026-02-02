# backend/quizzes/middleware.py
import jwt
from urllib.parse import parse_qs

from django.conf import settings
from django.contrib.auth import get_user_model
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken

User = get_user_model()

@database_sync_to_async
def get_user_from_token(token):
    """
    Decode JWT token using SimpleJWT and return Django user.
    """
    try:
        access_token = AccessToken(token)
        user_id = access_token["user_id"]
        return User.objects.get(id=user_id)
    except (TokenError, User.DoesNotExist, KeyError):
        return None


class TokenAuthMiddleware(BaseMiddleware):
    """
    Custom Channels middleware that takes a JWT token from query string.
    Sets scope['user'] to the authenticated user or AnonymousUser.
    """

    async def __call__(self, scope, receive, send):
        # Parse query string
        query_string = scope.get("query_string", b"").decode()
        query_params = parse_qs(query_string)
        token_list = query_params.get("token")
        user = None

        if token_list:
            token = token_list[0]
            user = await get_user_from_token(token)

        # Set scope["user"] (None if invalid token)
        scope["user"] = user
        return await super().__call__(scope, receive, send)


def TokenAuthMiddlewareStack(inner):
    """
    Helper to wrap the URLRouter with our custom middleware.
    """
    return TokenAuthMiddleware(inner)
