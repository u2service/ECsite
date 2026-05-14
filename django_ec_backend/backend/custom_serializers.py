# django_ec_backend/backend/custom_serializers.py

from dj_rest_auth.serializers import PasswordResetSerializer
from django.conf import settings

class CustomPasswordResetSerializer(PasswordResetSerializer):
    def get_email_options(self):
        return {
            # この行でドメインを上書きします
            'domain_override': 'localhost:3000',
            'email_template_name': 'registration/password_reset_email.html',
            'subject_template_name': 'registration/password_reset_subject.txt',
        }
        