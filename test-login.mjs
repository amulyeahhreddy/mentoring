// test-login.mjs
const SUPABASE_URL = "https://dnymnrceocbsgirwzphj.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRueW1ucmNlb2Nic2dpcnd6cGhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NjY5MTIsImV4cCI6MjA5MzU0MjkxMn0.B0nlsAZ6ZrLLSvewkUs9mntDSyg3TNEbmp1KK8L0WyI"; // Project Settings → API → anon/public key (not service role)

const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "apikey": ANON_KEY,
    },
    body: JSON.stringify({
        email: "dr.priya.sharma@mlrit.ac.in",
        password: "Password123!",
    }),
});

console.log("Status:", res.status);
const data = await res.json();
console.log(JSON.stringify(data, null, 2));