import bcrypt from 'bcryptjs';

export function hashPassword(password) {
  const salt = bcrypt.genSaltSync(12);
  return bcrypt.hashSync(password, salt);
}

export function verifyPassword(password, hashedPassword) {
  return bcrypt.compareSync(password, hashedPassword);
}
