/**
 * College Connect Backend - API Endpoint Tests
 * Quick reference for testing all V2 endpoints with curl or Postman
 */

// ============================================================================
// 1. AUTHENTICATION
// ============================================================================

// Register new student
POST /api/v1/auth/signup
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePass123",
  "branchId": "BRANCH_ID",
  "year": 2
}

// Login as student
POST /api/v1/auth/login
{
  "email": "john@example.com",
  "password": "securePass123"
}

// Login as Super Admin
POST /api/v1/auth/admin/login
{
  "email": "admin@example.com",
  "password": "admin@123"
}

// Get current user profile
GET /api/v1/auth/me
Header: Authorization: Bearer JWT_TOKEN

// Logout
POST /api/v1/auth/logout
Header: Authorization: Bearer JWT_TOKEN

// Request password reset OTP
POST /api/v1/auth/forgot-password/otp
{
  "email": "john@example.com"
}

// Reset password with OTP
POST /api/v1/auth/forgot-password/reset
{
  "email": "john@example.com",
  "otp": "123456",
  "password": "newPassword123"
}

// ============================================================================
// 2. USER PROFILE & DASHBOARD
// ============================================================================

// Get own profile
GET /api/v1/users/profile
Header: Authorization: Bearer JWT_TOKEN

// Update profile
PUT /api/v1/users/profile
Header: Authorization: Bearer JWT_TOKEN
{
  "name": "John Updated",
  "bio": "CSE student",
  "email": "newemail@example.com",
  "currentPassword": "securePass123"
}

// Upload profile photo
PUT /api/v1/users/profile/photo
Header: Authorization: Bearer JWT_TOKEN
Header: Content-Type: multipart/form-data
Body: photo (binary file)

// Get student dashboard with V2 data
GET /api/v1/users/dashboard
Header: Authorization: Bearer JWT_TOKEN

// Request section change
POST /api/v1/users/section-change-requests
Header: Authorization: Bearer JWT_TOKEN
{
  "requestedBranchId": "NEW_BRANCH_ID",
  "requestedYear": 3,
  "reason": "Transferred to different branch"
}

// Get my section change requests
GET /api/v1/users/section-change-requests/me
Header: Authorization: Bearer JWT_TOKEN

// ============================================================================
// 3. CHAT - Real-time Messaging
// ============================================================================

// Get chat history (cursor pagination)
GET /api/v1/chat/messages?branchId=BRANCH_ID&year=2&page=1&limit=50
Header: Authorization: Bearer JWT_TOKEN

// Send text message
POST /api/v1/chat/messages
Header: Authorization: Bearer JWT_TOKEN
{
  "branchId": "BRANCH_ID",
  "year": 2,
  "content": "Hello everyone!",
  "type": "text"
}

// Send file message
POST /api/v1/chat/messages
Header: Authorization: Bearer JWT_TOKEN
Header: Content-Type: multipart/form-data
Body: 
  branchId: BRANCH_ID
  year: 2
  content: "Check out this note"
  type: file
  file: (binary PDF/image)

// Send message with reply-to and mentions
POST /api/v1/chat/messages
Header: Authorization: Bearer JWT_TOKEN
{
  "branchId": "BRANCH_ID",
  "year": 2,
  "content": "@John Can you help?",
  "replyTo": "MESSAGE_ID",
  "mentions": ["USER_ID_OF_JOHN"]
}

// Edit own message
PATCH /api/v1/chat/messages/MESSAGE_ID
Header: Authorization: Bearer JWT_TOKEN
{
  "content": "Updated message content"
}

// Delete own message
DELETE /api/v1/chat/messages/MESSAGE_ID
Header: Authorization: Bearer JWT_TOKEN

// Add/remove reaction on message
PATCH /api/v1/chat/messages/MESSAGE_ID/reactions
Header: Authorization: Bearer JWT_TOKEN
{
  "emoji": "👍"
}

// ============================================================================
// SOCKET.IO EVENTS (WebSocket)
// ============================================================================

// Client connects to Socket.io
io.connect('http://localhost:5000')

// Join section chat room
socket.emit('join_section', {
  branchId: 'BRANCH_ID',
  year: 2
})

// Send message in real-time
socket.emit('send_message', {
  branchId: 'BRANCH_ID',
  year: 2,
  senderId: 'USER_ID',
  content: 'Hello!',
  type: 'text'
})

// Listen for incoming messages
socket.on('receive_message', (message) => {
  console.log('New message:', message)
})

// ============================================================================
// 4. STUDY MATERIALS
// ============================================================================

// List materials with filters
GET /api/v1/materials?branchId=BRANCH_ID&year=2&subject=DBMS&type=pdf&q=notes
Header: Authorization: Bearer JWT_TOKEN

// Upload study material
POST /api/v1/materials
Header: Authorization: Bearer JWT_TOKEN
Header: Content-Type: multipart/form-data
Body:
  title: Database Notes
  subject: DBMS
  description: Comprehensive DBMS notes
  branchId: BRANCH_ID
  year: 2
  semester: 3
  file: (binary PDF/image)
  tags: dbms,database,sql

// Get material details
GET /api/v1/materials/MATERIAL_ID
Header: Authorization: Bearer JWT_TOKEN

// Update material (edit title/description)
PUT /api/v1/materials/MATERIAL_ID
Header: Authorization: Bearer JWT_TOKEN
{
  "title": "Updated Title",
  "description": "Updated description"
}

// Delete material
DELETE /api/v1/materials/MATERIAL_ID
Header: Authorization: Bearer JWT_TOKEN

// Increment download count
PATCH /api/v1/materials/MATERIAL_ID/download
Header: Authorization: Bearer JWT_TOKEN

// Admin: Hide/restore/remove material
PATCH /api/v1/materials/MATERIAL_ID/status
Header: Authorization: Bearer ADMIN_JWT
{
  "status": "hidden",
  "reason": "Inappropriate content"
}

// ============================================================================
// 5. Q&A / DOUBTS
// ============================================================================

// Ask a doubt (with optional file attachments)
POST /api/v1/questions
Header: Authorization: Bearer JWT_TOKEN
Header: Content-Type: multipart/form-data
Body:
  title: What is normalization?
  description: Explain 1NF, 2NF, 3NF with examples
  branchId: BRANCH_ID
  year: 2
  tags: dbms,sql,normalization
  isAnonymous: false
  attachments: (optional files)

// List questions
GET /api/v1/questions?branchId=BRANCH_ID&year=2&status=open&q=normalization&tags=dbms
Header: Authorization: Bearer JWT_TOKEN

// Get question with answers
GET /api/v1/questions/QUESTION_ID
Header: Authorization: Bearer JWT_TOKEN

// Add answer
POST /api/v1/questions/QUESTION_ID/answers
Header: Authorization: Bearer JWT_TOKEN
Header: Content-Type: multipart/form-data
Body:
  content: Normalization reduces data redundancy...
  isAnonymous: false
  attachments: (optional files)

// Update question status (open → answered → resolved → closed)
PATCH /api/v1/questions/QUESTION_ID/status
Header: Authorization: Bearer JWT_TOKEN
{
  "status": "resolved"
}

// Increment question view count
PATCH /api/v1/questions/QUESTION_ID/view
Header: Authorization: Bearer JWT_TOKEN

// Follow/unfollow question
PATCH /api/v1/questions/QUESTION_ID/follow
Header: Authorization: Bearer JWT_TOKEN

// Get related questions
GET /api/v1/questions/QUESTION_ID/related
Header: Authorization: Bearer JWT_TOKEN

// Admin: Moderate question (hide/remove/restore)
PATCH /api/v1/questions/QUESTION_ID/moderation
Header: Authorization: Bearer ADMIN_JWT
{
  "action": "hide",
  "reason": "Off-topic"
}

// Upvote answer
PATCH /api/v1/answers/ANSWER_ID/upvote
Header: Authorization: Bearer JWT_TOKEN

// Downvote answer
PATCH /api/v1/answers/ANSWER_ID/downvote
Header: Authorization: Bearer JWT_TOKEN

// Accept answer (only question author)
PATCH /api/v1/answers/ANSWER_ID/accept
Header: Authorization: Bearer JWT_TOKEN

// Admin: Moderate answer
PATCH /api/v1/answers/ANSWER_ID/moderation
Header: Authorization: Bearer ADMIN_JWT
{
  "action": "remove",
  "reason": "Misinformation"
}

// ============================================================================
// 6. SAVED ITEMS (Bookmarks)
// ============================================================================

// Save a material or question
POST /api/v1/saved-items
Header: Authorization: Bearer JWT_TOKEN
{
  "entityType": "material",
  "entityId": "MATERIAL_ID"
}

// Get saved items
GET /api/v1/saved-items?entityType=question
Header: Authorization: Bearer JWT_TOKEN

// Delete saved item
DELETE /api/v1/saved-items/SAVED_ITEM_ID
Header: Authorization: Bearer JWT_TOKEN

// ============================================================================
// 7. EVENTS CALENDAR
// ============================================================================

// List events with filters
GET /api/v1/events?category=exam&status=upcoming&from=2026-05-01&to=2026-06-01
Header: Authorization: Bearer JWT_TOKEN

// Create event (Super Admin only)
POST /api/v1/events
Header: Authorization: Bearer ADMIN_JWT
{
  "title": "Mid Semester Exam",
  "description": "DBMS Exam",
  "category": "exam",
  "startsAt": "2026-05-15T09:00:00Z",
  "endsAt": "2026-05-15T11:00:00Z"
}

// Update event (Super Admin only)
PUT /api/v1/events/EVENT_ID
Header: Authorization: Bearer ADMIN_JWT
{
  "title": "Updated Exam Name",
  "description": "Updated description"
}

// Delete event (Super Admin only)
DELETE /api/v1/events/EVENT_ID
Header: Authorization: Bearer ADMIN_JWT

// ============================================================================
// 8. ANNOUNCEMENTS (Public-only in V2)
// ============================================================================

// Get all announcements
GET /api/v1/announcements
Header: Authorization: Bearer JWT_TOKEN

// Create announcement (Super Admin only)
POST /api/v1/announcements
Header: Authorization: Bearer ADMIN_JWT
{
  "title": "Mid Sem Notice",
  "content": "Classes will resume from Monday",
  "isPinned": true
}

// Update announcement
PUT /api/v1/announcements/ANNOUNCEMENT_ID
Header: Authorization: Bearer ADMIN_JWT
{
  "title": "Updated Title",
  "isPinned": false
}

// Delete announcement
DELETE /api/v1/announcements/ANNOUNCEMENT_ID
Header: Authorization: Bearer ADMIN_JWT

// ============================================================================
// 9. LEADERBOARD
// ============================================================================

// Get global leaderboard
GET /api/v1/leaderboard?scope=global
Header: Authorization: Bearer JWT_TOKEN

// Get section leaderboard
GET /api/v1/leaderboard?scope=section
Header: Authorization: Bearer JWT_TOKEN

// ============================================================================
// 10. AI STUDY HELPER
// ============================================================================

// Explain doubt
POST /api/v1/ai/doubts/QUESTION_ID/explain
Header: Authorization: Bearer JWT_TOKEN
{
  "regenerate": false
}

// Summarize material
POST /api/v1/ai/materials/MATERIAL_ID/summarize
Header: Authorization: Bearer JWT_TOKEN
{
  "regenerate": false
}

// Get AI request result
GET /api/v1/ai/requests/AI_REQUEST_ID
Header: Authorization: Bearer JWT_TOKEN

// ============================================================================
// 11. ADMIN - BRANCHES & ACADEMIC YEARS
// ============================================================================

// List branches
GET /api/v1/admin/branches
Header: Authorization: Bearer ADMIN_JWT

// Create branch
POST /api/v1/admin/branches
Header: Authorization: Bearer ADMIN_JWT
{
  "name": "Computer Science Engineering",
  "code": "CSE",
  "totalYears": 4
}

// Update branch
PUT /api/v1/admin/branches/BRANCH_ID
Header: Authorization: Bearer ADMIN_JWT
{
  "name": "CSE Updated"
}

// Activate/deactivate branch
PATCH /api/v1/admin/branches/BRANCH_ID/status
Header: Authorization: Bearer ADMIN_JWT
{
  "isActive": false
}

// List academic years
GET /api/v1/admin/academic-years
Header: Authorization: Bearer ADMIN_JWT

// Create academic year
POST /api/v1/admin/academic-years
Header: Authorization: Bearer ADMIN_JWT
{
  "yearNumber": 2,
  "label": "2nd Year"
}

// Update academic year
PUT /api/v1/admin/academic-years/YEAR_ID
Header: Authorization: Bearer ADMIN_JWT
{
  "label": "Second Year"
}

// Activate/deactivate year
PATCH /api/v1/admin/academic-years/YEAR_ID/status
Header: Authorization: Bearer ADMIN_JWT
{
  "isActive": false
}

// ============================================================================
// 12. ADMIN - STUDENT MANAGEMENT
// ============================================================================

// Get overview dashboard
GET /api/v1/admin/overview
Header: Authorization: Bearer ADMIN_JWT

// List students
GET /api/v1/admin/users?q=john&branchId=BRANCH_ID&year=2&status=active&page=1&limit=20
Header: Authorization: Bearer ADMIN_JWT

// Update student section
PUT /api/v1/admin/users/USER_ID/section
Header: Authorization: Bearer ADMIN_JWT
{
  "branchId": "NEW_BRANCH_ID",
  "currentYear": 3
}

// Activate/deactivate student
PATCH /api/v1/admin/users/USER_ID/status
Header: Authorization: Bearer ADMIN_JWT
{
  "status": "inactive"
}

// ============================================================================
// 13. ADMIN - MODERATION SYSTEM
// ============================================================================

// Get moderation actions history
GET /api/v1/admin/moderation/actions?entityType=message&action=hide&page=1&limit=20
Header: Authorization: Bearer ADMIN_JWT

// Create moderation action
POST /api/v1/admin/moderation/actions
Header: Authorization: Bearer ADMIN_JWT
{
  "entityType": "question",
  "entityId": "QUESTION_ID",
  "action": "hide",
  "reason": "Inappropriate content"
}

// Apply moderation (hide/restore/remove)
PATCH /api/v1/admin/moderation/message/MESSAGE_ID
Header: Authorization: Bearer ADMIN_JWT
{
  "action": "hide",
  "reason": "Spam"
}

// ============================================================================
// 14. ADMIN - SECTION CHANGE REQUESTS
// ============================================================================

// List pending section change requests
GET /api/v1/admin/section-change-requests?status=pending
Header: Authorization: Bearer ADMIN_JWT

// Approve or reject section change request
PATCH /api/v1/admin/section-change-requests/REQUEST_ID
Header: Authorization: Bearer ADMIN_JWT
{
  "status": "approved",
  "adminNote": "Approved"
}

// ============================================================================
// 15. ADMIN - YEAR PROMOTION
// ============================================================================

// Promote eligible students
POST /api/v1/admin/promote-students
Header: Authorization: Bearer ADMIN_JWT
{
  "force": false
}

// ============================================================================
// 16. PUBLIC ENDPOINTS (No auth required)
// ============================================================================

// Get public announcements
GET /api/v1/public/announcements

// Get active branches for signup
GET /api/v1/public/branches

// Get active years for signup
GET /api/v1/public/academic-years

// ============================================================================
// 17. HEALTH CHECK
// ============================================================================

// Check API is running
GET /api/v1/health
