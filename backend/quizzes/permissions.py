# backend/quizzes/permissions.py
from rest_framework.permissions import BasePermission, SAFE_METHODS

class IsTeacher(BasePermission):
    """
    Allows access only to users with role 'teacher' or staff.
    """
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (getattr(user, "role", None) == "teacher" or user.is_staff))


class IsOwnerOrReadOnly(BasePermission):
    """
    Object-level permission to only allow owners (created_by) to edit.
    Assumes model has `created_by` field.
    """
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return getattr(obj, "created_by", None) == request.user or request.user.is_staff