import { NextResponse } from "next/server";

const OLLAMA_URL = "http://localhost:11434/api/generate";

function normalizeStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      if (typeof item === "string") return item;
      if (
        typeof item === "object" &&
        item !== null &&
        "description" in item &&
        typeof (item as { description?: unknown }).description === "string"
      ) {
        return (item as { description: string }).description;
      }
      return null;
    })
    .filter((item): item is string => typeof item === "string");
}

function normalizeOutput(data: any, transcript: string) {
  const output = typeof data === "object" && data !== null ? data : {};

  output.session_info = output.session_info ?? {};
  output.discussion = output.discussion ?? {};
  output.mentor_actions = output.mentor_actions ?? {};

  output.discussion.issues_discussed = normalizeStringArray(
    output.discussion.issues_discussed
  );
  output.discussion.academic_concerns = Array.isArray(output.discussion.academic_concerns)
    ? output.discussion.academic_concerns
    : [];
  output.discussion.personal_concerns = Array.isArray(output.discussion.personal_concerns)
    ? output.discussion.personal_concerns
    : [];
  output.mentor_actions.suggestions = normalizeStringArray(
    output.mentor_actions.suggestions
  );
  output.mentor_actions.tasks_assigned = Array.isArray(output.mentor_actions.tasks_assigned)
    ? output.mentor_actions.tasks_assigned
    : [];

  const transcriptLower = transcript.toLowerCase();

  if (output.discussion.academic_concerns.length === 0) {
    const academicKeywords = ["dsa", "exam", "marks", "assignment"];
    const matchedAcademic = academicKeywords.filter((keyword) =>
      transcriptLower.includes(keyword),
    );
    if (matchedAcademic.length > 0) {
      output.discussion.academic_concerns.push(...matchedAcademic);
    }
  }

  if (output.discussion.personal_concerns.length === 0) {
    const personalKeywords = ["stress", "tired", "focus", "distracted"];
    const matchedPersonal = personalKeywords.filter((keyword) =>
      transcriptLower.includes(keyword),
    );
    if (matchedPersonal.length > 0) {
      output.discussion.personal_concerns.push(...matchedPersonal);
    }
  }

  if (output.discussion.academic_concerns.length > 0) {
    output.session_info.session_category = "academic";
  } else if (output.discussion.personal_concerns.length > 0) {
    output.session_info.session_category = "personal";
  }

  if (output.mentor_actions.suggestions.length === 0) {
    if (output.discussion.academic_concerns.length > 0) {
      output.mentor_actions.suggestions.push(
        "Create a structured study plan for weak subjects",
        "Practice problems daily for better understanding",
      );
    }

    if (output.discussion.personal_concerns.length > 0) {
      output.mentor_actions.suggestions.push(
        "Reduce distractions like phone usage",
        "Maintain a consistent daily routine",
        "Practice stress management techniques",
      );
    }
  }

  if (output.mentor_actions.tasks_assigned.length === 0) {
    output.mentor_actions.tasks_assigned.push(
      "Complete 5 practice problems daily",
      "Follow a fixed study schedule for the next week",
    );
  }

  if (typeof output.summary !== "string" || output.summary.trim() === "") {
    output.summary =
      "Student is facing issues related to academics and/or personal challenges.";
  }

  return output;
}

export async function POST(req: Request) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Missing transcript" }, { status: 400 });
  }

  const transcript =
    typeof body === "object" && body !== null && "transcript" in body
      ? (body as { transcript?: unknown }).transcript
      : undefined;

  if (transcript === undefined) {
    return NextResponse.json({ error: "Missing transcript" }, { status: 400 });
  }

  if (typeof transcript !== "string" || transcript.trim() === "") {
    return NextResponse.json({ error: "Empty transcript" }, { status: 400 });
  }

  const prompt = `You are an AI assistant that extracts structured information from mentoring session transcripts.

STRICT RULES:

1. Return ONLY valid JSON
2. Do NOT skip any fields
3. Always include ALL keys from schema
4. If no data, use empty arrays []
5. Classify carefully:

   * academic → studies, exams, DSA
   * personal → stress, distraction, focus

OUTPUT FORMAT (STRICT):
{
"session_info": {
"date": "",
"duration_minutes": null,
"session_category": "academic | personal | career | general"
},
"discussion": {
"issues_discussed": [],
"academic_concerns": [],
"personal_concerns": []
},
"mentor_actions": {
"suggestions": [],
"tasks_assigned": []
},
"follow_up": {
"required": true,
"details": ""
},
"student_state": {
"sentiment": "positive | neutral | negative",
"confidence_level": "high | medium | low"
},
"summary": ""
}

IMPORTANT:

* Always populate all arrays
* Do not leave missing keys
* Do not return partial JSON

Transcript:
${transcript}`;

  let ollamaData: { response?: unknown };
  try {
    const ollamaRes = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen2.5:3b",
        prompt,
        stream: false,
      }),
    });

    if (!ollamaRes.ok) {
      return NextResponse.json({ error: "Ollama API failure" }, { status: 500 });
    }

    ollamaData = await ollamaRes.json();
  } catch {
    return NextResponse.json({ error: "Ollama API failure" }, { status: 500 });
  }

  if (typeof ollamaData.response !== "string") {
    return NextResponse.json({ error: "Parsing failure" }, { status: 500 });
  }

  const jsonMatch = ollamaData.response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 500 });
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    const normalized = normalizeOutput(parsed, transcript);
    return NextResponse.json(normalized);
  } catch {
    return NextResponse.json({ error: "Parsing failure" }, { status: 500 });
  }
}
