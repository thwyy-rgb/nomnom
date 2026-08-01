export const ADMIN_EMAILS = [
  "admin@gmail.com",
  "zinzie0619@gmail.com", 
];

export function isAdminUser(user) {
  if (!user || !user.email) return false;
  return ADMIN_EMAILS.includes(user.email.toLowerCase());
}