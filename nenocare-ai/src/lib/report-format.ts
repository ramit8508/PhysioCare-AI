export type ReportSection = {
  title: string;
  bullets: string[];
};

function normalizeLine(raw: string) {
  let line = String(raw || "").trim();
  if (!line) {
    return "";
  }

  line = line.replace(/\*\*/g, "").replace(/`/g, "").trim();
  line = line.replace(/^[-*+]\s+/, "").trim();
  line = line.replace(/^\d+[\.)]\s+/, "").trim();
  line = line.replace(/^#+\s*/, "").trim();
  return line;
}

export function parseAiReportSections(text: string, defaultTitle = "Report"): ReportSection[] {
  const rawLines = String(text || "").split("\n");
  const sections: ReportSection[] = [];
  let current: ReportSection | null = null;

  for (const raw of rawLines) {
    const trimmed = String(raw || "").trim();
    if (!trimmed) {
      continue;
    }

    if (trimmed.startsWith("## ")) {
      if (current) {
        sections.push(current);
      }
      current = {
        title: normalizeLine(trimmed.replace(/^##\s+/, "")) || defaultTitle,
        bullets: [],
      };
      continue;
    }

    const looksLikeHeader = /^[A-Za-z][A-Za-z\s]{2,40}:$/.test(trimmed);
    if (!current && looksLikeHeader) {
      current = { title: normalizeLine(trimmed.replace(/:$/, "")) || defaultTitle, bullets: [] };
      continue;
    }

    const line = normalizeLine(trimmed);
    if (!line) {
      continue;
    }

    if (!current) {
      current = { title: defaultTitle, bullets: [] };
    }

    current.bullets.push(line);
  }

  if (current) {
    sections.push(current);
  }

  return sections.filter((section) => section.title || section.bullets.length > 0);
}

export function normalizeAiReportMarkdown(text: string, fallback: string) {
  const sections = parseAiReportSections(text || "");
  if (!sections.length) {
    return fallback;
  }

  return sections
    .map((section) => {
      const title = section.title || "Report";
      const bullets = section.bullets.length
        ? section.bullets.map((bullet) => `- ${bullet}`).join("\n")
        : "- No additional details.";
      return `## ${title}\n${bullets}`;
    })
    .join("\n\n");
}
