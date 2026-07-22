import type { QuickAddCategory } from "@/types/services";

const template = (id: string, name: string, durationMinutes: number, priceBhd: number, description = "") => ({ id, name, durationMinutes, priceBhd, description });
export const quickAddCategories: QuickAddCategory[] = [
  { name: "Hair – Cut & Style", templates: [template("mens-haircut", "Men's Haircut", 30, 12), template("kids-haircut", "Kids' Haircut", 30, 9), template("blow-dry", "Blow-dry & Styling", 30, 14), template("wash-cut-blowdry", "Wash, Cut & Blow-dry", 60, 24), template("hair-updo", "Hair Updo / Occasion Styling", 45, 25), template("bridal-hair", "Bridal Hair", 90, 55)] },
  { name: "Hair – Color & Treatment", templates: [template("root-color", "Root Color", 75, 28), template("full-color", "Full Hair Color", 120, 48), template("highlights", "Highlights", 150, 60), template("keratin", "Keratin Treatment", 150, 75)] },
  { name: "Nails", templates: [template("classic-manicure", "Classic Manicure", 45, 15), template("gel-manicure", "Gel Manicure", 60, 22), template("classic-pedicure", "Classic Pedicure", 60, 20)] },
  { name: "Facials & Skincare", templates: [template("express-facial", "Express Facial", 30, 20), template("deep-cleansing", "Deep Cleansing Facial", 60, 35), template("hydrating-facial", "Hydrating Facial", 60, 38)] },
  { name: "Massage & Body", templates: [template("swedish-massage", "Swedish Massage", 60, 28), template("deep-tissue", "Deep Tissue Massage", 60, 30), template("body-scrub", "Body Scrub", 45, 25)] },
  { name: "Waxing & Hair Removal", templates: [template("full-arms-wax", "Full Arms Wax", 30, 12), template("full-legs-wax", "Full Legs Wax", 45, 18), template("full-body-wax", "Full Body Wax", 90, 45)] },
  { name: "Brows & Lashes", templates: [template("brow-shaping", "Brow Shaping", 20, 7), template("brow-lamination", "Brow Lamination", 45, 24), template("lash-lift", "Lash Lift", 60, 30)] },
  { name: "Makeup", templates: [template("day-makeup", "Day Makeup", 45, 25), template("evening-makeup", "Evening Makeup", 60, 35), template("bridal-makeup", "Bridal Makeup", 90, 70)] },
  { name: "Men’s Grooming", templates: [template("beard-trim", "Beard Trim", 20, 7), template("mens-facial", "Men's Facial", 45, 25), template("grooming-package", "Grooming Package", 75, 35)] },
  { name: "Henna / Mehndi", templates: [template("simple-henna", "Simple Henna Design", 30, 12), template("bridal-henna", "Bridal Henna", 120, 60)] },
];
