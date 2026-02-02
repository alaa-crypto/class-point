from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from .models import Quiz, Question, Choice, Session, Participant, Answer

User = get_user_model()

# -------------------------
# User serializers
# -------------------------
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("id", "username", "email", "password", "first_name", "last_name")

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name")


# -------------------------
# Quiz / Question / Choice
# -------------------------
class ChoiceSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model = Choice
        fields = ("id", "text", "is_correct")


class QuestionSerializer(serializers.ModelSerializer):
    choices = ChoiceSerializer(many=True, required=False)

    class Meta:
        model = Question
        fields = ("id", "text", "question_type", "marks", "choices", "order", "time_limit")

    def create(self, validated_data):
        choices_data = validated_data.pop("choices", [])
        question = Question.objects.create(**validated_data)
        for c in choices_data:
            Choice.objects.create(question=question, **c)
        return question

    def update(self, instance, validated_data):
        choices_data = validated_data.pop("choices", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if choices_data is not None:
            instance.choices.all().delete()
            for c in choices_data:
                Choice.objects.create(question=instance, **c)
        return instance


class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, required=False, read_only=True)
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = Quiz
        fields = ("id", "title", "created_by", "created_at", "questions")


class QuizCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Quiz
        fields = ("id", "title")


# -------------------------
# Session / Participant / Answer
# -------------------------
class SessionSerializer(serializers.ModelSerializer):
    quiz = QuizSerializer(read_only=True)
    host = UserSerializer(source="quiz.created_by", read_only=True)
    # Remove finished_at or use the actual field name
    finished_at = serializers.DateTimeField(source="ended_at", read_only=True, required=False)

    class Meta:
        model = Session
        fields = ("id", "quiz", "host", "pin", "started_at", "finished_at")


class SessionCreateSerializer(serializers.ModelSerializer):
    quiz = serializers.PrimaryKeyRelatedField(queryset=Quiz.objects.all())
    pin = serializers.CharField(read_only=True)
    host = UserSerializer(read_only=True)

    class Meta:
        model = Session
        fields = ["id", "quiz", "pin", "host", "started_at"]  # REMOVED finished_at
        read_only_fields = ["id", "pin", "host", "started_at"]  # REMOVED finished_at

    def create(self, validated_data):
        host = self.context["request"].user
        quiz = validated_data["quiz"]
        session = Session.objects.create(quiz=quiz)
        return session


class ParticipantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Participant
        fields = ("id", "session", "name", "score")


class ParticipantJoinSerializer(serializers.Serializer):
    pin = serializers.CharField(max_length=32)
    name = serializers.CharField(max_length=150)

    def validate(self, attrs):
        pin = attrs.get("pin")
        try:
            session = Session.objects.get(pin=pin)
        except Session.DoesNotExist:
            raise serializers.ValidationError({"pin": "Session with this PIN does not exist."})
        attrs["session_obj"] = session
        return attrs

    def create(self, validated_data):
        session = validated_data["session_obj"]
        name = validated_data["name"]
        participant, created = Participant.objects.get_or_create(
            session=session, name=name
        )
        return participant


class AnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Answer
        fields = ("id", "participant", "question", "choice", "answered_at", "correct")
        read_only_fields = ("answered_at", "correct")