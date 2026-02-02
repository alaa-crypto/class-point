from django.shortcuts import get_object_or_404
from rest_framework import generics, status, viewsets
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import api_view, permission_classes
from django.utils.crypto import get_random_string
from django.utils import timezone
from rest_framework.views import APIView
from django.db import IntegrityError

from .models import Quiz, Question, Choice, Session, Participant, Answer
from .serializers import (
    RegisterSerializer, UserSerializer,
    QuizSerializer, QuizCreateUpdateSerializer,
    QuestionSerializer, SessionSerializer, SessionCreateSerializer,
    ParticipantJoinSerializer, ParticipantSerializer, AnswerSerializer
)
from .permissions import IsTeacher
from django.contrib.auth import get_user_model

User = get_user_model()


# -------------------------
# Registration
# -------------------------
class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = (AllowAny,)


# -------------------------
# Quiz ViewSet
# -------------------------
class QuizViewSet(viewsets.ModelViewSet):
    """
    /api/quizzes/  (GET list, POST create)
    /api/quizzes/{id}/
    """
    queryset = Quiz.objects.all().order_by("-created_at")
    serializer_class = QuizSerializer
    permission_classes = (IsAuthenticated,)

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return QuizCreateUpdateSerializer
        return QuizSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def get_permissions(self):
        # Only teachers can create/update/delete
        if self.action in ("create", "update", "partial_update", "destroy"):
            permission_classes = (IsAuthenticated, IsTeacher)
        else:
            permission_classes = (IsAuthenticated,)
        return [p() for p in permission_classes]


# -------------------------
# Question creation
# -------------------------
class QuestionCreateView(generics.CreateAPIView):
    permission_classes = (IsAuthenticated, IsTeacher)
    serializer_class = QuestionSerializer

    def perform_create(self, serializer):
        quiz_id = self.request.data.get("quiz")
        if not quiz_id:
            raise serializers.ValidationError({"quiz": "quiz id required"})
        quiz = get_object_or_404(Quiz, pk=quiz_id)
        serializer.save(quiz=quiz)


# -------------------------
# Session creation / control
# -------------------------
def _generate_pin():
    """Generate a unique 6-digit PIN."""
    for _ in range(10):
        pin = get_random_string(6, allowed_chars="0123456789")
        if not Session.objects.filter(pin=pin).exists():
            return pin
    # fallback if collisions
    return get_random_string(8, allowed_chars="0123456789")


class SessionCreateView(generics.CreateAPIView):
    """
    Teachers create a live session for a quiz.
    Auto-generates a unique PIN and sets host.
    """
    permission_classes = (IsAuthenticated, IsTeacher)
    serializer_class = SessionCreateSerializer

    def perform_create(self, serializer):
        # Assign host and generate unique PIN
        pin = _generate_pin()
        serializer.save(pin=pin)


class SessionDetailView(generics.RetrieveAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = SessionSerializer
    queryset = Session.objects.all()
    lookup_field = "id"


# -------------------------
# Participant join
# -------------------------
class ParticipantJoinView(generics.CreateAPIView):
    permission_classes = (AllowAny,)
    serializer_class = ParticipantJoinSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        try:
            participant = serializer.save()
            return Response({
                "participant": {
                    "id": participant.id,
                    "name": participant.name,
                    "score": participant.score
                },
                "session": {
                    "id": participant.session.id,
                    "pin": participant.session.pin,
                }
            }, status=status.HTTP_201_CREATED)

        except IntegrityError:
            # Handle duplicate name in session
            session = serializer.validated_data['session_obj']
            name = serializer.validated_data['name']
            
            # Get the existing participant or create with a unique name
            base_name = name
            counter = 1
            while True:
                try:
                    if counter == 1:
                        participant_name = base_name
                    else:
                        participant_name = f"{base_name}_{counter}"
                    
                    participant, created = Participant.objects.get_or_create(
                        session=session, 
                        name=participant_name
                    )
                    break
                except IntegrityError:
                    counter += 1
                    if counter > 100:  # Safety limit
                        return Response(
                            {"detail": "Could not create unique participant name."},
                            status=status.HTTP_400_BAD_REQUEST
                        )

            return Response({
                "participant": {
                    "id": participant.id,
                    "name": participant.name,  # This might be different from requested name
                    "score": participant.score
                },
                "session": {
                    "id": participant.session.id,
                    "pin": participant.session.pin,
                }
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
# -------------------------
# Answer submission (non-socket fallback)
# -------------------------
class AnswerCreateView(generics.CreateAPIView):
    permission_classes = (AllowAny,)
    serializer_class = AnswerSerializer

    def create(self, request, *args, **kwargs):
        data = request.data
        participant_id = data.get("participant")
        question_id = data.get("question")
        choice_id = data.get("choice")

        participant = get_object_or_404(Participant, pk=participant_id)
        question = get_object_or_404(Question, pk=question_id)
        choice = get_object_or_404(Choice, pk=choice_id) if choice_id else None

        # Create answer
        answer = Answer.objects.create(
            participant=participant,
            question=question,
            choice=choice
        )

        correct = bool(choice and choice.is_correct)
        answer.correct = correct
        answer.save()

        # Update participant score
        if correct:
            participant.score += int(question.marks or 1)
            participant.save()

        return Response(
            {"answer_id": answer.id, "correct": correct},
            status=status.HTTP_201_CREATED
        )


# -------------------------
# Session actions (start / next / end)
# -------------------------
class SessionActionView(APIView):
    permission_classes = (IsAuthenticated, IsTeacher)

    def post(self, request, session_id, action):
        session = get_object_or_404(Session, pk=session_id)

        if session.host != request.user and not request.user.is_staff:
            return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

        if action == "start":
            session.started_at = timezone.now()
            session.save()
            return Response({"status": "started", "started_at": session.started_at})

        elif action == "end":
            session.finished_at = timezone.now()
            session.save()
            return Response({"status": "ended", "finished_at": session.finished_at})

        elif action == "next":
            from .serializers import QuestionSerializer
            qid = request.data.get("question_id")
            if qid:
                question = get_object_or_404(Question, pk=qid)
            else:
                question = session.quiz.questions.order_by("order").first()
                if not question:
                    return Response({"detail": "No questions"}, status=status.HTTP_400_BAD_REQUEST)
            q_ser = QuestionSerializer(question)
            return Response({"status": "ok", "question": q_ser.data})

        return Response({"detail": "unknown action"}, status=status.HTTP_400_BAD_REQUEST)


# -------------------------
# Session leaderboard / scores
# -------------------------
class SessionScoresView(generics.ListAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = ParticipantSerializer

    def get_queryset(self):
        session_id = self.kwargs.get("session_id")
        return Participant.objects.filter(session__id=session_id).order_by("-score")



class QuestionViewSet(viewsets.ModelViewSet):
    """
    API for managing questions
    """
    queryset = Question.objects.all().order_by("order")
    serializer_class = QuestionSerializer
    permission_classes = (IsAuthenticated, IsTeacher)

    def perform_create(self, serializer):
        # Automatically set the quiz if not provided
        quiz_id = self.request.data.get("quiz")
        if quiz_id:
            quiz = get_object_or_404(Quiz, pk=quiz_id)
            serializer.save(quiz=quiz)
        else:
            # Use the user's first quiz or create one
            user_quizzes = Quiz.objects.filter(created_by=self.request.user)
            if user_quizzes.exists():
                quiz = user_quizzes.first()
            else:
                quiz = Quiz.objects.create(
                    title=f"{self.request.user.username}'s Quiz",
                    created_by=self.request.user
                )
            serializer.save(quiz=quiz)