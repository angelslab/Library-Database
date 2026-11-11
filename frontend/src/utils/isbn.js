export function formatISBN(value) {
  const digits = String(value).replace(/[^0-9]/g, "");

  return [
    digits.slice(0, 3),
    digits.slice(3, 5),
    digits.slice(5, 10),
    digits.slice(10, 12),
    digits.slice(12, 13),
  ]
    .filter(Boolean)
    .join("-");
}
