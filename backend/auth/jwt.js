const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET;

// phát token: ghi userID + role, hết hạn sau 8 giờ
function createToken(user) {
  return jwt.sign({ userID: user.userID, role: user.role }, SECRET, {
    expiresIn: "8h",
  });
}

// đọc header "Authorization: Bearer <token>"
// token thật và còn hạn thì trả về { userID, role }, ngược lại trả về null
function readToken(req) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return null;
  }

  try {
    return jwt.verify(header.slice(7), SECRET);
  } catch {
    return null;
  }
}

module.exports = { createToken, readToken };