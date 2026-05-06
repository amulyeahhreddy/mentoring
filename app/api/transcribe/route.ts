import { NextResponse } from "next/server";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB
const ALLOWED_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/m4a",
  "audio/webm",
  "audio/mp4",
]);

const MOCK_TRANSCRIPTS = [
  "Sir actually I wanted to discuss academics first, like I am trying DSA every day but trees and DP are still not clicking for me. I mean exams are close and I already have one backlog, so that pressure is always there in my head. Attendance is also kind of low because I missed morning classes last month. By night I open the phone for ten minutes and then one hour goes, and next day I feel guilty and tired. I do not know how to balance classes, coding, and sleep properly.",
  "Ma'am, like I am not fully okay these days, I sit to study but focus breaks very fast. I mean in class I understand for some time, then my mind goes to pending assignments and internals marks. Attendance dropped because I was doing club work and some family stuff, and now I am scared about detention. Also my friends call me out in the evening, and I kind of lose the whole study plan after that. I am studying, but not in a consistent way at all.",
  "Sir actually the main issue is time management, but it is mixing with everything else now. Like I make a timetable on Sunday and by Tuesday it already fails because labs and submissions come suddenly. I mean I am weak in DSA basics, so coding rounds are taking too much time and exam prep is getting delayed. I am also sleeping late because of reels, then I miss first lecture and attendance goes down again. Honestly I feel burned out even before the semester is over.",
  "I wanted help because I am kind of stuck between exam prep and clearing backlog subjects. Like whenever I start old syllabus revision, current semester assignments pile up and I panic. Sir actually my attendance is short in two subjects, so I keep thinking about that instead of concentrating. I mean stress is there all day and I get distracted by random chats and phone notifications. Then at night I feel I did nothing meaningful even after being busy the whole day.",
  "Ma'am, I think I am trying but output is very low, like I sit with laptop for hours and still finish only one small task. I mean for DSA I can solve easy questions, but medium ones take too long and confidence drops immediately. Attendance became an issue because I was skipping classes to study, but that plan also did not work. I am kind of mentally tired, and even small things make me irritated now. Can you guide me how to restart with a realistic routine?",
  "Sir actually I am worried about upcoming exams because last internal marks were not good. Like I planned to improve this month, but I keep jumping between subjects and nothing gets completed. I mean there is backlog pressure also, plus low attendance warning came last week. I get distracted very easily by friends in hostel and phone at night, and then mornings are gone. It feels like I am running all day but still behind in academics.",
];

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: Request) {
  try {
    console.log("=== TRANSCRIBE API HIT ===");
    console.log("Parsing form data...");
    const formData = await req.formData();
    const audio = formData.get("audio");
    const file = audio instanceof File ? audio : null;

    console.log("File received:", {
      name: file?.name,
      type: file?.type,
      size: file?.size,
    });
    console.log("Validating file...");

    if (!audio || !(audio instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(audio.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    if (audio.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "Invalid file size" }, { status: 400 });
    }

    console.log("File validation passed");

    console.log("Mock transcription started");
    const delay = 1000 + Math.floor(Math.random() * 1001); // 1000ms to 2000ms
    await sleep(delay);

    const selectedIndex = Math.floor(Math.random() * MOCK_TRANSCRIPTS.length);
    let transcript = MOCK_TRANSCRIPTS[selectedIndex];

    const rawFileName = audio.name.replace(/\.[^/.]+$/, "").trim();
    if (rawFileName) {
      transcript = `${transcript} This was from my recording "${rawFileName}".`;
    }

    console.log("Mock transcription completed");
    console.log("Selected transcript length:", transcript.length);

    console.log("Sending response back to client");
    return NextResponse.json({ transcript });
  } catch (error) {
    console.error("❌ Transcription error:", error);
    return NextResponse.json({ error: "Mock transcription failure" }, { status: 500 });
  }
}
