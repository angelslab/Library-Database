# Library Management System

Group 6, Section: **17184**

Team members: Angel Garcia, Phi Tran, Murshid Mohammed Maharoof, Luke Hatley, Jesse Okumbor

A web app for a library. Students and faculty browse the catalog, borrow items, place holds, and pay fines. Librarians manage the catalog, users, and loans, and run reports. The data is in a MySQL database. What the app does, the user roles, the triggers, and the reports are described in the project document.

## Hosted version

**Website:** https://red-river-0a79ae10f.5.azurestaticapps.net

| Role | Email | Password |
| --- | --- | --- |
| Librarian | admin@lib.com | 1234. |
| Student | emma.johnson@lib.edu | Test1234! |
| Student | sophia.kim@lib.edu | Test1234! |
| Faculty | sarah.williams@lib.edu | Test1234! |
| Faculty | linda.davis@lib.edu | Test1234! |

All the other test accounts also end in @lib.edu and use the password `Test1234!`.

## Files in this submission

| File | Description |
| --- | --- |
| `README.md` | This file. |
| `library_database_dump.sql` | SQL dump of the populated database, including the triggers. |
| `Project Document` | Describes the application. |
| `backend/` | The Node.js server. `server.js` has the routes, `schema.js` creates the tables, `triggers.js` creates the triggers. |
| `frontend/` | The React app. Pages are in `src/pages`, components in `src/component`. |
| `.github/workflows/` | The files that deploy the app to Azure. |

The code is also on GitHub: https://github.com/angelslab/Library-Database

## Steps to run in your own computer

You need Node.js 22 or newer and MySQL 8.0 or newer.

**1. Load the database**

```sql
CREATE DATABASE librarydatabase;
```

```
mysql -u root -p librarydatabase < library_database_dump.sql
```

(In MySQL Workbench you can use Server → Data Import instead.) If the import complains about a `DEFINER` user, remove the `DEFINER=...` part from the dump and import again. The backend also creates the triggers when it starts.

**2. Start the backend**

In the `backend` folder, make a file named `.env`:

```
DB_HOST=localhost
DB_USER=root
DB_PASS=your_mysql_password
DB_NAME=librarydatabase
```

Then run:

```
npm install
node server.js
```

You should see `Server running at PORT:  3000`.

**3. Start the frontend**

In the `frontend` folder:

```
npm install
npm run dev
```

Open http://localhost:5173. The frontend uses the backend at http://localhost:3000 unless `VITE_API_URL` is set in a `frontend/.env` file.

**4. Log in** with the accounts above. To make your own librarian, run this in the `backend` folder:

```
node create-librarian.js librarian@library.test YourPassword Test Librarian
```

## Hosting

The database is Azure Database for MySQL. The backend is an Azure App Service and the frontend is an Azure Static Web App. Both deploy from GitHub when `main` changes.
