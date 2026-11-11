// Adds dummy books to the catalog for testing.
//   Run from the backend folder:  node seed-dummy-books.js
// Safe to run more than once: a book whose ISBN already exists is skipped.
// The ISBNs are made up (they all start with 999) so they never clash with real ones,
// and they make the seeded books easy to find later.

const db = require("./db");
const { addBook } = require("./catalog/book");

const BOOKS = [
  ["Pride and Prejudice", "Jane Austen", 1813, 4],
  ["Moby-Dick", "Herman Melville", 1851, 2],
  ["Frankenstein", "Mary Shelley", 1818, 3],
  ["Great Expectations", "Charles Dickens", 1861, 3],
  ["The Adventures of Huckleberry Finn", "Mark Twain", 1884, 2],
  ["Dracula", "Bram Stoker", 1897, 2],
  ["The Great Gatsby", "F. Scott Fitzgerald", 1925, 5],
  ["To Kill a Mockingbird", "Harper Lee", 1960, 4],
  ["1984", "George Orwell", 1949, 5],
  ["Brave New World", "Aldous Huxley", 1932, 3],
  ["The Catcher in the Rye", "J. D. Salinger", 1951, 3],
  ["The Hobbit", "J. R. R. Tolkien", 1937, 4],
  ["Fahrenheit 451", "Ray Bradbury", 1953, 3],
  ["Beloved", "Toni Morrison", 1987, 2],
  ["One Hundred Years of Solitude", "Gabriel Garcia Marquez", 1967, 2],
  ["The Alchemist", "Paulo Coelho", 1988, 4],
  ["A Brief History of Time", "Stephen Hawking", 1988, 3],
  ["Cosmos", "Carl Sagan", 1980, 2],
  ["Introduction to Algorithms", "Thomas H. Cormen", 1990, 6],
  ["Clean Code", "Robert C. Martin", 2008, 4],
  ["The Pragmatic Programmer", "Andrew Hunt", 1999, 3],
  ["Database System Concepts", "Abraham Silberschatz", 1986, 5],
];

async function main() {
  let added = 0;
  let skipped = 0;

  for (let i = 0; i < BOOKS.length; i++) {
    const [title, author, year, copies] = BOOKS[i];
    const isbn = `9990000000${String(i + 1).padStart(3, "0")}`;

    const [existing] = await db.query("SELECT itemID FROM book WHERE isbn = ?", [isbn]);

    if (existing.length > 0) {
      skipped++;
      continue;
    }

    await addBook(title, author, isbn, year, copies, null);
    added++;
    console.log(`Added: ${title} (${copies} copies)`);
  }

  console.log(`Done. ${added} added, ${skipped} already there.`);
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
