"use client";

/**
 * Starting points for a badge. Each preset sets the chrome, the accent, and
 * the field labels that kind of card usually carries — the user still supplies
 * every value, and can change any of it afterwards.
 *
 * These are generic layouts for organisations to issue their own passes. None
 * of them reproduces a government document.
 */

import type { CardData, CardLayout, CardOrientation } from "./card";

export interface CardTemplate {
  id: string;
  name: string;
  description: string;
  accent: string;
  layout: CardLayout;
  orientation: CardOrientation;
  rolePlaceholder: string;
  fieldLabels: string[];
}

export const TEMPLATES: CardTemplate[] = [
  {
    id: "staff",
    name: "Staff pass",
    description: "Employee badge with a coloured header",
    accent: "#10b981",
    layout: "band",
    orientation: "landscape",
    rolePlaceholder: "Job title",
    fieldLabels: ["Employee No.", "Department", "Issued"],
  },
  {
    id: "student",
    name: "Student card",
    description: "Portrait card for schools and colleges",
    accent: "#2563eb",
    layout: "band",
    orientation: "portrait",
    rolePlaceholder: "Year or programme",
    fieldLabels: ["Student No.", "Course", "Valid until"],
  },
  {
    id: "event",
    name: "Event pass",
    description: "Conference or festival badge, photo up top",
    accent: "#7c3aed",
    layout: "band",
    orientation: "portrait",
    rolePlaceholder: "Attendee type",
    fieldLabels: ["Pass No.", "Access", "Dates"],
  },
  {
    id: "member",
    name: "Membership card",
    description: "Gym, club or library card with a side stripe",
    accent: "#d97706",
    layout: "sidebar",
    orientation: "landscape",
    rolePlaceholder: "Membership type",
    fieldLabels: ["Member No.", "Joined", "Renews"],
  },
  {
    id: "volunteer",
    name: "Volunteer badge",
    description: "Simple pass for crews and volunteers",
    accent: "#e11d48",
    layout: "sidebar",
    orientation: "landscape",
    rolePlaceholder: "Team or role",
    fieldLabels: ["Crew", "Contact", "Valid"],
  },
  {
    id: "artwork",
    name: "Your own artwork",
    description: "Composite onto a blank card design you supply",
    accent: "#334155",
    layout: "plain",
    orientation: "landscape",
    rolePlaceholder: "Role",
    fieldLabels: ["ID No.", "Issued"],
  },
];

export function getTemplate(id: string): CardTemplate {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

/**
 * Apply a template without discarding what the user has already typed —
 * switching template should restyle the card, not wipe it.
 */
export function applyTemplate(data: CardData, template: CardTemplate): CardData {
  const fields = template.fieldLabels.map((label, i) => ({
    id: `t${i}`,
    label,
    // Keep any value the user already entered in that slot.
    value: data.fields[i]?.value ?? "",
  }));

  return {
    ...data,
    templateId: template.id,
    accent: template.accent,
    layout: template.layout,
    orientation: template.orientation,
    fields,
  };
}
