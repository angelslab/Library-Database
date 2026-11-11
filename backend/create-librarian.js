// Creates a librarian account (the Register page only makes student and faculty).
//   Run from the backend folder:
//     node create-librarian.js [email] [password] [first name] [last name]
// With no arguments it makes librarian@library.test and prints a random password.
// If that email already exists nothing is changed.

const crypto = require("crypto");
const db = require("./db");
const { setPassword } = require("./auth/auth");

const email = (process.argv[2] || "librarian@library.test").trim();
const givenPassword = process.argv[3] || process.env.LIBRARIAN_PASSWORD;
const firstName = process.argv[4] || "Test";
const lastName = process.argv[5] || "Librarian";

// no password given: make a random one and show it once in this terminal
const password = givenPassword || crypto.randomBytes(9).toString("base64url");

async function main() {
  if (password.length === 0) {
    throw new Error("Password can't be empty");
  }

  if (password.length < 8) {
    console.log("Note: that password is short. Fine for testing, but use a longer one for real accounts.");
  }

  const [existing] = await db.query("SELECT userID, role FROM users WHERE email = ?", [email]);

  if (existing.length > 0) {
    console.log(`${email} already exists (role: ${existing[0].role}). Nothing changed.`);
    return;
  }

  const [result] = await db.query(
    "INSERT INTO users (first_name, last_name, email, role) VALUES (?, ?, ?, 'librarian')",
    [firstName, lastName, email],
  );

  const userID = result.insertId;

  await db.query("INSERT INTO librarian (userID) VALUES (?)", [userID]);
  await setPassword(userID, password);

  console.log(`Librarian account created (userID ${userID}).`);
  console.log(`Email:    ${email}`);
  console.log(givenPassword ? "Password: the one you gave" : `Password: ${password}`);
}

main()
  .catch((error) => {
    console.error("Could not create the librarian:", error.message);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
