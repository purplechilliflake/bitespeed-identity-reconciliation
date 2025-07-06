# 🛡️ Bitespeed Identity Reconciliation

This is my implementation of the Bitespeed Backend Task: Identity Reconciliation, where given incoming contact information (email, phone), we identify existing contacts or create new ones, maintaining primary and secondary relationships to avoid duplicates.

---

Problem Statement

The goal is to build an API endpoint `/identify` that receives a JSON payload containing `email` and/or `phoneNumber`. The system should:

✅ Return an existing contact if it matches an existing email or phone.  
✅ Merge contacts if email & phone match multiple contacts.  
✅ Create a new contact if no existing matches are found.  
✅ Maintain relationships between primary and secondary contacts, returning consolidated lists of emails, phone numbers, and secondary IDs.

See the original task description here:
https://www.notion.so/bitespeed/Bitespeed-Backend-Task-Identity-Reconciliation-1fb21bb2a930802eb896d4409460375c

---

API Specification

POST /identify  
Accepts:
{
  "email": "example@example.com",
  "phoneNumber": "1234567890"
}

Returns:
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["example@example.com"],
    "phoneNumbers": ["1234567890"],
    "secondaryContactIds": [2, 3]
  }
}

---

Tech Stack

- Node.js
- Express
- PostgreSQL
- pg npm module
- dotenv

---

Setup Instructions

1) Clone the repo:
git clone https://github.com/purplechilliflake/bitespeed-identity-reconciliation.git
cd bitespeed-identity-reconciliation

2) Install dependencies:
npm install

3) Create a .env file with your Postgres connection string:
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/bitespeed
PORT=3000

4) Set up your Postgres database:
CREATE TABLE identities (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255),
  phoneNumber VARCHAR(20),
  linkedId INTEGER
);

5) Start the server:
npm start

6) Test the API with curl:
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"foo@example.com","phoneNumber":"1234567890"}'

---

Sample Test Cases

✅ Create new contact:
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","phoneNumber":"1112223333"}'

✅ Match existing contact by phone, add new email:
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"bob@example.com","phoneNumber":"1112223333"}'

✅ Query by phone only:
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"1112223333"}'

✅ Match existing contact by email only:
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com"}'

✅ Create new contact with different details:
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"charlie@example.com","phoneNumber":"5554443333"}'

---

Notes

- The system always maintains a primary contact with the smallest id among linked contacts.
- Secondary contacts are linked using the linkedId field pointing to the primary.
- The API response consolidates all emails and phone numbers in the group.

---

License

MIT License. Feel free to use or modify this project for your own needs.

---

Author

Built with ❤️ by purplechilliflake (https://github.com/purplechilliflake).
