# 📋 Project Overview
A PowerPoint Add-in for interactive classroom quizzes with real-time student engagement, leaderboards, and question management.

# 🏗️Project Structure
text
classpoint-mvp/
├── addin-teacher/           # PowerPoint Add-in (port 3001)
│   ├── src/                   # React + Office.js
│   └── manifest.xml           # Office Add-in config
├── student-client/          # Student Web App (port 3000)
│   ├── src/                   # React student interface
│   └── public/
├── backend/                   # Django + WebSockets (port 8000)
│   ├── classpoint/           # Django project
│   ├── quizzes/              # Quizzes app
│   └── docker-compose.yml

⚡ Quick Start
Prerequisites
bash
# Required Software
- Node.js 16+ & npm
- Python 3.10+
- Docker & Docker Compose
- PowerPoint 2016+ (for testing)
- Git


# 1.	Backend Setup (Django)
# Make sure you activate the .venv first

bash
cd backend
# Start database and API
docker-compose up --build -d

# Check if running (should see Django at localhost:8000)
curl http://localhost:8000/api/auth/token/

# 2. Student Frontend Setup (React App)
bash
cd student-frontend

# Install dependencies
npm install

# Start dev server (port 3000)
npm start
# Access at: http://localhost:3000

# Student app now runs on http://localhost:3000 
# Check: You should see a “Join Session” page. You can keep this open in a browser tab — later you’ll enter the session PIN there. 

# 3. Teacher Frontend Setup (Office Add-in)
bash
cd teacher-frontend

# Install dependencies
npm install

# Start dev server (port 3001)
npm start
# Access at: http://localhost:3001

# 4. Load Teacher Add-in in PowerPoint
# Make sure you copy the manifest.xml file into a folder. Then make sure you share this folder with the ppt.
# To share it: 
Go to File -> Options -> Trust Center -> Trust Center Settings -> Trusted Add-in Catalogs then add the shared folder URL (make sure it is the same as the share name of the folder). 
Then after this, restart the ppt and now you Go to Insert → My Add-ins → Shared Folder Add it.
PowerPoint will open a right-hand task pane (your React UI). 
You now have your local add-in loaded.

# 🔧 Configuration
# Environment Variables
# Backend (.env file):
env
DEBUG=True
SECRET_KEY=your-secret-key
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=postgres://postgres:postgres@db:5432/classpoint
REDIS_URL=redis://redis:6379
# Frontend (.env file):
env
REACT_APP_API_URL=http://localhost:8000
HTTPS=false
PORT=3001

# 🚀How The Project Works

# Authentication Flow
1. Teacher logs in via React form, for now there is only one active account (username: root, password: admin), 
2. JWT token obtained from Django (/api/auth/token/)
3. Token stored in React state & localStorage
4. All subsequent API calls include token in headers
   
# Quiz Session Flow
1. Teacher selects quiz → Creates session → Gets PIN
2. Students join via PIN at http://localhost:3000
3. Teacher pushes questions → Students answer in real-time
4. WebSocket updates leaderboard automatically
5. Teacher can end session or push more questions
   
# WebSocket Communication
javascript
// Teacher connects:
ws://localhost:8000/ws/session/{PIN}/

// Message types:
- host_join: Teacher joins session
- host_push_question: Push question to students
- host_end_session: End session
- score_update: Real-time leaderboard updates
  
# Backend
text
classpoint/settings.py  # Django settings with CORS
quizzes/models.py       # Quiz, Question, Session models
quizzes/views.py        # REST API endpoints
quizzes/consumers.py    # WebSocket handlers
docker-compose.yml     # Service orchestration

#🔌 API Endpoints
Authentication
text
POST   /api/auth/token/     # Get JWT token
POST   /api/auth/refresh/   # Refresh token

#🛠️ Development
Common Issues & Fixes
1. CORS Errors in PowerPoint
xml
<!-- In manifest.xml -->
<AppDomains>
  <AppDomain>http://localhost:8000</AppDomain>
  <AppDomain>ws://localhost:8000</AppDomain>
</AppDomains>
2. Office.js "Script error"
•	Remove all alert() and prompt() calls
•	Use console.log() instead
•	Ensure Office.onReady() wraps React render
3. Blank Page in PowerPoint
javascript
// src/index.tsx MUST have:
if (window.Office) {
  Office.onReady(() => {
    // Render React here
  });
}
4. WebSocket Connection Issues
python
# Django settings.py
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {"hosts": [("redis", 6379)]},
    },
}
Testing
bash
# Test API endpoints
curl -X POST http://localhost:8000/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"teacher","password":"password"}'

#Test WebSocket
wscat -c ws://localhost:8000/ws/session/123456/



