from django.db import models
from django.contrib.auth.models import User
import uuid
import random


class Quiz(models.Model):
    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, help_text="Unique ID for this quiz"
    )
    title = models.CharField(max_length=255, help_text="Title of the quiz")
    description = models.TextField(blank=True, help_text="Optional short description")
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="created_quizzes",
        help_text="Teacher who created this quiz",
    )
    created_at = models.DateTimeField(auto_now_add=True, help_text="Creation timestamp")
    updated_at = models.DateTimeField(auto_now=True, help_text="Last modification timestamp")
    is_public = models.BooleanField(default=False, help_text="Can this quiz be shared publicly")

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Quiz"
        verbose_name_plural = "Quizzes"

    def __str__(self):
        return self.title


class Question(models.Model):
    quiz = models.ForeignKey(
        Quiz, on_delete=models.CASCADE, related_name="questions", help_text="Parent quiz"
    )
    text = models.CharField(max_length=500, help_text="Question text")
    time_limit = models.PositiveIntegerField(default=30, help_text="Time limit (in seconds)")
    order = models.PositiveIntegerField(default=0, help_text="Position of question in quiz")
    created_at = models.DateTimeField(auto_now_add=True)

    # Keep these properties as they don't conflict
    @property
    def marks(self):
        return 1

    @property
    def question_type(self):
        return "single"

    class Meta:
        ordering = ["order"]
        indexes = [models.Index(fields=["quiz", "order"])]

    def __str__(self):
        return f"Q{self.order + 1}: {self.text[:50]}"


class Choice(models.Model):
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name="choices",
        help_text="Parent question",
    )
    text = models.CharField(max_length=255, help_text="Choice text")
    is_correct = models.BooleanField(default=False, help_text="Is this choice correct?")

    # Keep this property as it doesn't conflict
    @property
    def correct(self):
        return self.is_correct

    def __str__(self):
        return f"{self.text} ({'correct' if self.is_correct else 'wrong'})"


class Session(models.Model):
    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name="sessions",
        help_text="Quiz being played in this session",
    )
    code = models.UUIDField(
        default=uuid.uuid4, editable=False, unique=True, help_text="Internal UUID for session"
    )
    pin = models.CharField(
        max_length=6,
        unique=True,
        editable=False,
        help_text="Human-friendly PIN for students to join (6 digits)",
    )
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    def save(self, *args, **kwargs):
        if not self.pin:
            self.pin = str(random.randint(100000, 999999))
        super().save(*args, **kwargs)

    # REMOVED conflicting properties:
    # @property
    # def finished_at(self):
    #     return self.ended_at
    #
    # @property  
    # def host(self):
    #     return self.quiz.created_by

    def __str__(self):
        return f"Session {self.pin} ({'Active' if self.is_active else 'Ended'})"


class Participant(models.Model):
    session = models.ForeignKey(
        Session,
        on_delete=models.CASCADE,
        related_name="participants",
        help_text="Quiz session joined by this participant",
    )
    name = models.CharField(max_length=100, help_text="Name of the participant")
    score = models.IntegerField(default=0)
    joined_at = models.DateTimeField(auto_now_add=True)

    # REMOVED conflicting property:
    # @property
    # def username(self):
    #     return self.name

    class Meta:
        unique_together = ("session", "name")
        ordering = ["-score"]

    def __str__(self):
        return f"{self.name} ({self.session.pin})"


class Answer(models.Model):
    participant = models.ForeignKey(
        Participant,
        on_delete=models.CASCADE,
        related_name="answers",
        help_text="Participant who submitted this answer",
    )
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name="answers",
        help_text="Question being answered",
    )
    choice = models.ForeignKey(
        Choice,
        on_delete=models.CASCADE,
        related_name="answers",
        help_text="Choice selected",
    )
    is_correct = models.BooleanField(default=False)
    answered_at = models.DateTimeField(auto_now_add=True)

    # Keep this property as it doesn't conflict
    @property
    def correct(self):
        return self.is_correct

    class Meta:
        unique_together = ("participant", "question")
        ordering = ["answered_at"]

    def __str__(self):
        return f"{self.participant.name} → {self.question.text[:40]} ({'✓' if self.is_correct else '✗'})"