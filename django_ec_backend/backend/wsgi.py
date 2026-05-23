import os
import sys
from django.core.wsgi import get_wsgi_application

current_dir = os.path.dirname(os.path.abspath(__file__))  # backend/ フォルダ
parent_dir = os.path.dirname(current_dir)                 # django_ec_backend/ フォルダ
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)
    
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

application = get_wsgi_application()
