# Expense Tracker

Full-stack expense tracker using React + Vite, Node.js + Express, MySQL, and JWT authentication.

## Features
- Register/login
- Add, edit, delete expenses
- Expense categories
- Dashboard totals
- Monthly budget
- Search/filter
- Responsive UI
- MySQL persistence
- JWT protected API

## Setup

### 1. Database
Create a MySQL database and run `server/schema.sql`.

### 2. Server
```bash
cd server
npm install
copy .env.example .env
# edit .env with your MySQL credentials
npm run dev
```

### 3. Client
Open another terminal:
```bash
cd client
npm install
npm run dev
```

Frontend: http://localhost:5173
API: http://localhost:5000
