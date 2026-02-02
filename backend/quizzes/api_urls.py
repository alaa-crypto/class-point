# backend/quizzes/api_urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView, QuizViewSet, QuestionCreateView, QuestionViewSet,  # ADD QuestionViewSet
    SessionCreateView, SessionDetailView, ParticipantJoinView,
    AnswerCreateView, SessionActionView, SessionScoresView
)
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

router = DefaultRouter()
router.register(r"quizzes", QuizViewSet, basename="quizzes")
router.register(r'questions', QuestionViewSet, basename='questions')  # ADD this

urlpatterns = [
    # auth
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # quizzes & questions (viewset) - included via router
    path("", include(router.urls)),

    # sessions
    path("sessions/", SessionCreateView.as_view(), name="session-create"),
    path("sessions/<int:id>/", SessionDetailView.as_view(), name="session-detail"),
    path("sessions/<int:session_id>/action/<str:action>/", SessionActionView.as_view(), name="session-action"),

    # participant join
    path("participants/join/", ParticipantJoinView.as_view(), name="participant-join"),

    # answers (REST fallback)
    path("answers/create/", AnswerCreateView.as_view(), name="answer-create"),

    # scores
    path("sessions/<int:session_id>/scores/", SessionScoresView.as_view(), name="session-scores"),
]