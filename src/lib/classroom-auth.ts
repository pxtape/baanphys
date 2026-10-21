/** Usernames are mapped to an internal Auth email; students do not need an inbox. */
export function normalizeClassroomUsername(value: string): string | null {
  const username = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{1,38}[a-z0-9]$/.test(username) || username.includes("..")) return null;
  return username;
}

export function classroomEmail(value: string): string | null {
  const username = normalizeClassroomUsername(value);
  return username ? `${username}@classroom.invalid` : null;
}
