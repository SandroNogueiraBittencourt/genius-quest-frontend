export function Avatar({ name, index = 0 }: { name: string; index?: number }) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase() || '?';
  return (
    <span
      aria-hidden="true"
      className={`ui-avatar ui-avatar--${Math.abs(index) % 3}`}
    >
      {initials}
    </span>
  );
}
