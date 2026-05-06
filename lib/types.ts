export interface MentoringSession {
  session_info: {
    date: string;
    duration_minutes: number | null;
    session_category: "academic" | "personal" | "career" | "general";
  };
  discussion: {
    issues_discussed: string[];
    academic_concerns: string[];
    personal_concerns: string[];
  };
  mentor_actions: {
    suggestions: string[];
    tasks_assigned: string[];
  };
  follow_up: {
    required: boolean;
    details: string;
  };
  student_state: {
    sentiment: "positive" | "neutral" | "negative";
    confidence_level: "high" | "medium" | "low";
  };
  summary: string;
}
