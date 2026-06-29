import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { searchHandbook } from "@/lib/rag";

// SCRUM-058 — Tester le RAG sur les documents RH validés (corpus FR SCRUM-050).
// Live : embede la question via OpenRouter puis interroge pgvector. Self-skip
// sans OPENROUTER_API_KEY (comme rag.live.test.ts). Vérifie, pour le rôle
// Collaborateur (EMPLOYEE) : (1) la bonne source validée est citée, (2) la
// similarité dépasse un seuil, (3) les champs de citation sont présents,
// (4) la cohérence FR/EN après harmonisation, (5) le filtrage RBAC de base.
const hasKey = !!process.env.OPENROUTER_API_KEY;
const d = hasKey ? describe : describe.skip;

// Seuil de pertinence minimal attendu pour une réponse "sourçable".
const MIN_SIMILARITY = 0.4;

// Questions RH français-uniquement → aucune ambiguïté avec le handbook anglais.
// Chaque cas attend une source précise dans la collection "politiques-rh".
const CASES: { question: string; expectedSlug: string; sectionRe?: RegExp }[] = [
  {
    question: "Comment demander une attestation de travail ?",
    expectedSlug: "procedure-attestation-travail",
  },
  {
    question: "Comment se passe l'intégration d'un nouveau collaborateur ?",
    expectedSlug: "guide-onboarding",
  },
  {
    question: "Combien de jours de congé exceptionnel pour un mariage ?",
    expectedSlug: "politique-conges-absences",
    sectionRe: /exceptionnel/i,
  },
  {
    question: "Combien de temps les données RH sont-elles conservées après la fin du contrat ?",
    expectedSlug: "politique-confidentialite-securite-rh",
    sectionRe: /conservation/i,
  },
  {
    question: "Quelles sont les conditions pour pouvoir télétravailler ?",
    expectedSlug: "reglement-teletravail",
  },
];

d("SCRUM-058 — RAG sur les documents RH validés (live)", () => {
  beforeAll(async () => {
    const chunks = await prisma.handbookChunk.count({
      where: { document: { collection: { slug: "politiques-rh" } } },
    });
    if (chunks === 0) {
      throw new Error(
        "Corpus 'politiques-rh' non ingéré : publie les 5 documents SCRUM-050 " +
          "(statut PUBLISHED) puis ré-ingère avant de lancer ce test.",
      );
    }
  });

  afterAll(() => prisma.$disconnect());

  it.each(CASES)(
    "répond depuis une source validée : $question",
    async ({ question, expectedSlug, sectionRe }) => {
      const hits = await searchHandbook(question, 3, { role: "EMPLOYEE" });

      // (1) Des sources sont remontées, et la meilleure vient du corpus RH validé.
      expect(hits.length).toBeGreaterThan(0);
      expect(hits[0].collectionSlug).toBe("politiques-rh");

      // (2) Le document attendu figure parmi les meilleures sources.
      const target = hits.find((h) => h.articleSlug === expectedSlug);
      expect(target, `attendu ${expectedSlug} dans le top 3`).toBeTruthy();
      if (sectionRe) {
        expect(hits.some((h) => sectionRe.test(h.section))).toBe(true);
      }

      // (3) Seuil de similarité + champs de citation (titre + ancre de section).
      expect(hits[0].similarity ?? 0).toBeGreaterThan(MIN_SIMILARITY);
      expect(hits[0].articleTitle).toBeTruthy();
      expect(hits[0].articleSlug).toBeTruthy();
      expect(hits[0].section).toBeTruthy();
    },
    45_000,
  );

  it(
    "donne une réponse cohérente sur le congé annuel quelle que soit la langue de la requête",
    async () => {
      // Le modèle reformule parfois la question en anglais : les deux corpus
      // doivent désormais s'accorder sur 18 jours ouvrables (conflit résolu).
      // On inspecte le top-3 (les chunks réellement fournis à l'assistant).
      const fr = await searchHandbook("combien de jours de congé annuel", 3, { role: "EMPLOYEE" });
      const en = await searchHandbook("annual leave days per year", 3, { role: "EMPLOYEE" });

      expect(fr.some((h) => /18/.test(h.content))).toBe(true);
      expect(en.some((h) => /18/.test(h.content))).toBe(true);
      // Aucune source ne doit encore mentionner l'ancienne valeur de 20 jours.
      expect(en.every((h) => !/20 days/i.test(h.content))).toBe(true);
    },
    45_000,
  );

  it(
    "n'expose jamais un document hors périmètre à un collaborateur",
    async () => {
      // Les bandes salariales (HR_ONLY, collection hr-internal) ne doivent jamais
      // remonter pour un EMPLOYEE, même sur une requête qui les vise.
      const hits = await searchHandbook("grille des salaires et bandes de rémunération", 5, {
        role: "EMPLOYEE",
      });
      expect(hits.every((h) => h.collectionSlug !== "hr-internal")).toBe(true);
    },
    45_000,
  );
});
