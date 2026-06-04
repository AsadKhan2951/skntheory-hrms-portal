// Superhero avatar options
export const SUPERHERO_AVATARS = [
  { id: "ironman", name: "Iron Man", emoji: "🦾", color: "#C8102E" },
  { id: "batman", name: "Batman", emoji: "🦇", color: "#1C1C1C" },
  { id: "superman", name: "Superman", emoji: "💪", color: "#0476F2" },
  { id: "hulk", name: "Hulk", emoji: "💚", color: "#5DBB63" },
  { id: "thor", name: "Thor", emoji: "⚡", color: "#FFD700" },
  { id: "wonderwoman", name: "Wonder Woman", emoji: "⭐", color: "#DC143C" },
  { id: "loki", name: "Loki", emoji: "🐍", color: "#228B22" },
  { id: "joker", name: "Joker", emoji: "🃏", color: "#9B59B6" },
] as const;

export type AvatarId = typeof SUPERHERO_AVATARS[number]["id"];

export function getAvatarById(id: string | null | undefined) {
  return SUPERHERO_AVATARS.find(avatar => avatar.id === id) || SUPERHERO_AVATARS[0];
}
