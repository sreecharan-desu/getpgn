export function getTimeGreeting(name?: string): string {
  const hour = new Date().getHours();
  let phrase: string;
  if (hour >= 5 && hour < 12) phrase = "Good morning";
  else if (hour >= 12 && hour < 17) phrase = "Good afternoon";
  else if (hour >= 17 && hour < 22) phrase = "Good evening";
  else phrase = "Good night";

  const display = name?.trim();
  return display ? `${phrase}, ${display}` : phrase;
}
