import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname ?? ".", "..");

export function read(p: string): string {
  return fs.readFileSync(path.join(ROOT, p), "utf8");
}

export function norm(s: string): string {
  return s.replace(/\s+/g, " ").toLowerCase();
}

export function body(skill: string): string {
  const marker = skill.match(/^---\n[\s\S]*?\n---\n/);
  return marker ? skill.slice(marker[0].length) : skill;
}
