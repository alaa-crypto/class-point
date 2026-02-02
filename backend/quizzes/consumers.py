# backend/quizzes/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from .models import Quiz, Question, Choice, Session, Participant, Answer


User = get_user_model()


class SessionConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for a quiz session.
    URL pattern provides `pin` as a route_kwarg.
    """

    async def connect(self):
        from .models import Session, Participant, Answer, Choice, Question
        self.pin = self.scope["url_route"]["kwargs"].get("pin")
        if not self.pin:
            await self.close(code=4001)
            return

        self.group_name = f"session_{self.pin}"

        # Optionally get the user (if using Django auth or middleware that sets scope['user'])
        self.user = self.scope.get("user", None)
        # Accept connection and add to group
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Optionally send current session state (e.g., scoreboard or current question)
        await self.send_current_state()

    async def disconnect(self, close_code):
        # Remove from group
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        """
        Expected incoming JSON messages with at least { "action": "<str>", ... }
        Actions handled:
          - "ping" (echo)
          - "join" { participant_id }  # NEW: student join action
          - "host_join" { token, session_pin }  
          - "answer" { participant_id, choice_id }
          - "host_push_question" { question_id }  # host only
        """
        if text_data is None:
            return

        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            await self.send_json({"error": "invalid_json"})
            return

        action = data.get("action")
        
        # NEW: Handle student join action
        if action == "join":
            participant_id = data.get("participant_id")
            if not participant_id:
                await self.send_json({"error": "missing_participant_id"})
                return

            # Validate participant exists and belongs to this session
            is_valid_participant = await self.validate_participant_join(participant_id, self.pin)
            if is_valid_participant:
                await self.send_json({"type": "join_success"})
                print(f"✅ Student participant {participant_id} joined session {self.pin}")
            else:
                await self.send_json({"error": "join_failed", "detail": "Invalid participant or session"})
            return

        if action == "host_join":
            token = data.get("token")
            session_pin = data.get("session_pin")
            if not token or not session_pin:
                await self.send_json({"error": "missing_token_or_pin"})
                return

            # Validate host token and session ownership
            is_valid_host = await self.validate_host_join(token, session_pin)
            if is_valid_host:
                await self.send_json({"type": "host_join_success"})
                print(f"✅ Host successfully joined session {session_pin}")
            else:
                await self.send_json({"error": "host_join_failed", "detail": "Invalid token or session ownership"})
            return

        if action == "ping":
            await self.send_json({"action": "pong"})
            return

        if action == "answer":
            participant_id = data.get("participant_id")
            choice_id = data.get("choice_id")
            if participant_id is None or choice_id is None:
                await self.send_json({"error": "missing_fields"})
                return

            # Save the answer and update scores (DB ops run in sync wrappers)
            saved = await self.save_answer_and_update_score(participant_id, choice_id)
            if not saved:
                await self.send_json({"error": "save_failed"})
                return

            # Broadcast updated scoreboard to the session group
            scoreboard = await self.build_scoreboard(self.pin)
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "score.update",  # maps to method score_update
                    "scoreboard": scoreboard,
                },
            )
            return

        if action == "host_push_question":
            # Host pushes a question to participants
            question_id = data.get("question_id")
            if question_id is None:
                await self.send_json({"error": "missing_question_id"})
                return

            # Optionally authorize host here (e.g., check self.user is session owner)
            question_payload = await self.get_question_payload(question_id)
            if question_payload is None:
                await self.send_json({"error": "question_not_found"})
                return

            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "question.push",  # maps to question_push
                    "question": question_payload,
                },
            )
            return

        # Unknown action
        await self.send_json({"error": "unknown_action", "action": action})

    # ------- Group message handlers (called by group_send) -------

    async def score_update(self, event):
        """
        Handler invoked when group_send sends type 'score.update'
        """
        scoreboard = event.get("scoreboard", [])
        await self.send_json({"type": "score_update", "scoreboard": scoreboard})

    async def question_push(self, event):
        """
        Handler invoked when host pushes a question
        """
        question = event.get("question")
        await self.send_json({"type": "question", "question": question})

    # ------- Utility helpers -------

    async def send_current_state(self):
        """
        Optionally send the current session state to newly connected clients.
        For now, send the current scoreboard.
        """
        try:
            scoreboard = await self.build_scoreboard(self.pin)
            await self.send_json({"type": "score_update", "scoreboard": scoreboard})
        except Exception:
            # Ignore errors on initial state send
            pass

    async def send_json(self, payload):
        """Helper to send JSON over the socket"""
        await self.send(text_data=json.dumps(payload))

    # NEW: Student join validation method
    @database_sync_to_async
    def validate_participant_join(self, participant_id, session_pin):
        """
        Validate that the participant exists and belongs to this session.
        """
        try:
            participant = Participant.objects.get(id=participant_id)
            # Verify participant belongs to the session with this PIN
            if participant.session.pin == session_pin:
                return True
            return False
        except (Participant.DoesNotExist, Session.DoesNotExist):
            return False

    # NEW: Host join validation method
    @database_sync_to_async
    def validate_host_join(self, token, session_pin):
        """
        Validate that the token belongs to the user who owns this session.
        """
        try:
            from rest_framework_simplejwt.tokens import AccessToken
            # Decode and validate JWT token
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            user = User.objects.get(id=user_id)
            
            # Verify user owns the session
            session = Session.objects.get(pin=session_pin)
            if session.quiz.created_by == user:
                return True
            return False
        except Exception as e:
            print(f"❌ Host join validation error: {e}")
            return False

    # DB operations must use database_sync_to_async wrappers

    @database_sync_to_async
    def save_answer_and_update_score(self, participant_id, choice_id):
        """
        Saves an Answer row and updates the Participant.score based on correctness.
        Returns True if saved, False otherwise.
        """
        try:
            # Convert to integers
            participant_id = int(participant_id)
            choice_id = int(choice_id)
            
            participant = Participant.objects.get(pk=participant_id)
            choice = Choice.objects.select_related("question").get(pk=choice_id)

            print(f"🔍 Processing answer: {participant.name} -> {choice.text} (correct: {choice.is_correct})")

            # Use get_or_create to handle unique constraint - FIXED FIELD NAMES
            answer, created = Answer.objects.get_or_create(
                participant=participant,
                question=choice.question,
                defaults={
                    'choice': choice,
                    'is_correct': choice.is_correct  # CHANGED: 'correct' → 'is_correct'
                }
            )

            if not created:
                # Answer already exists - update it
                print(f"🔄 Updating existing answer")
                old_correct = answer.is_correct  # CHANGED: answer.correct → answer.is_correct
                answer.choice = choice
                answer.is_correct = choice.is_correct  # CHANGED
                answer.save()

                # Update score if correctness changed
                if choice.is_correct and not old_correct:
                    # Changed from wrong to correct
                    participant.score = (participant.score or 0) + 1
                    participant.save(update_fields=["score"])
                    print(f"📈 Score increased: {participant.name} now has {participant.score}")
                elif not choice.is_correct and old_correct:
                    # Changed from correct to wrong
                    participant.score = max(0, (participant.score or 0) - 1)
                    participant.save(update_fields=["score"])
                    print(f"📉 Score decreased: {participant.name} now has {participant.score}")
            else:
                # New answer
                print(f"✅ Created new answer")
                if choice.is_correct:
                    participant.score = (participant.score or 0) + 1
                    participant.save(update_fields=["score"])
                    print(f"📈 Score increased: {participant.name} now has {participant.score}")

            return True

        except Participant.DoesNotExist:
            print(f"❌ Participant {participant_id} not found")
            return False
        except Choice.DoesNotExist:
            print(f"❌ Choice {choice_id} not found")
            return False
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
            import traceback
            traceback.print_exc()
            return False
        
    @database_sync_to_async
    def build_scoreboard(self, pin):
        """
        Build a list of participants and their scores for the session identified by pin.
        Returns a list of dicts sorted by score descending.
        """
        try:
            session = Session.objects.get(pin=pin)
        except Session.DoesNotExist:
            return []

        participants = Participant.objects.filter(session=session).order_by("-score", "joined_at")
        # produce serializable scoreboard
        board = [
            {
                "participant_id": p.id,
                "name": p.name if hasattr(p, "name") else getattr(p.user, "username", "anonymous"),
                "score": p.score or 0,
            }
            for p in participants
        ]
        return board

    @database_sync_to_async
    def get_question_payload(self, question_id):
        """
        Return a serializable question payload with choices.
        """
        try:
            q = Question.objects.get(pk=question_id)
        except Question.DoesNotExist:
            return None

        # Use the correct related name here
        choices = list(q.choices.all().values("id", "text"))

        return {
            "id": q.id,
            "text": q.text,
            "choices": choices,
            "time_limit": getattr(q, "time_limit", None),
        }