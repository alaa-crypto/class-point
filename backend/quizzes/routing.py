# backend/quizzes/routing.py
from django.urls import re_path
from .consumers import SessionConsumer

websocket_urlpatterns = [
    # include both wss and ws patterns to be permissive — consumer will accept either
    re_path(r"^wss/session/(?P<pin>\w+)/$", SessionConsumer.as_asgi()),
    re_path(r"^ws/session/(?P<pin>\w+)/$", SessionConsumer.as_asgi()),
]
