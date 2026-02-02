import os
import django
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "classpoint.settings")
django.setup()  # <-- this line is crucial!

import quizzes.routing  # must come *after* django.setup()

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(quizzes.routing.websocket_urlpatterns)
    ),
})
