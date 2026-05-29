export const PORTFOLIO_DEFAULTS: Record<string, { attributes: string[]; programOutcomes: string[] }> = {
  "Reports prepared": { attributes: ["A1","A4","A5"], programOutcomes: ["PO1","PO2","PO4","PO9","PO10","PO11"] },
  "Products/Projects": { attributes: ["A1","A2","A4","A5"], programOutcomes: ["PO1","PO2","PO3","PO4","PO5","PO9"] },
  "Documentation of presentations made": { attributes: ["A1","A2","A3","A4","A6"], programOutcomes: ["PO1","PO2","PO4","PO10"] },
  "Products developed as part of Co-Curricular Activities": { attributes: ["A1","A4","A5"], programOutcomes: ["PO1","PO2","PO4","PO5","PO10","PO11"] },
  "Published articles in Newsletter/College Magazine": { attributes: ["A1","A2","A3","A4","A6"], programOutcomes: ["PO1","PO2","PO4","PO10","PO11"] },
  "Testimonials/Appreciation Letters/Certificates": { attributes: ["A3","A4","A5"], programOutcomes: ["PO8","PO10","PO11"] },
  "Poster/Pictures/Artwork created": { attributes: ["A3","A4","A5"], programOutcomes: ["PO8","PO10","PO11"] },
  "Committee/Student Council/Volunteering documentation": { attributes: ["A3","A4","A5"], programOutcomes: ["PO8","PO10","PO11"] },
  "Literary activities/Competitions": { attributes: ["A1","A3","A4","A5"], programOutcomes: ["PO1","PO2","PO4","PO8","PO10","PO11"] },
  "Mathematical Competitions": { attributes: ["A1","A2","A4","A5"], programOutcomes: ["PO1","PO2","PO3","PO4","PO8","PO10","PO11"] },
  "Participation in Professional Societies": { attributes: ["A1","A3","A4","A6"], programOutcomes: ["PO1","PO2","PO4","PO8","PO10","PO11"] },
  "Professional growth examples": { attributes: ["A3","A4","A5"], programOutcomes: ["PO8","PO10","PO11"] },
  "Paper/Poster presentations": { attributes: ["A1","A3","A4","A5"], programOutcomes: ["PO1","PO2","PO3","PO4","PO8","PO10","PO11"] },
  "Participation in Entrepreneurial Development activities": { attributes: ["A2","A4","A6"], programOutcomes: ["PO2","PO3","PO4","PO5","PO6","PO7","PO8","PO10","PO11"] },
  "Peer teaching carried out": { attributes: ["A1","A4","A5"], programOutcomes: ["PO1","PO2","PO4","PO8","PO10","PO11"] },
  "Community services": { attributes: ["A2","A3","A4","A6"], programOutcomes: ["PO2","PO3","PO4","PO5","PO6","PO7","PO8","PO10","PO11"] },
}

export const ARTIFACT_TYPES = Object.keys(PORTFOLIO_DEFAULTS)
export const ALL_ATTRIBUTES = ["A1","A2","A3","A4","A5","A6"]
export const ALL_PROGRAM_OUTCOMES = ["PO1","PO2","PO3","PO4","PO5","PO6","PO7","PO8","PO9","PO10","PO11"]
