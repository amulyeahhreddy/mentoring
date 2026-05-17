// seed-auth.mjs
// Run with: node seed-auth.mjs

const SUPABASE_URL = "https://dnymnrceocbsgirwzphj.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRueW1ucmNlb2Nic2dpcnd6cGhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzk2NjkxMiwiZXhwIjoyMDkzNTQyOTEyfQ.abKxoLXTrLMZcxtq9sKo2CCTjogFxKtLJg2HPsyuXsQ"; // from Project Settings → API

const users = [
    { email: "dr.priya.sharma@mlrit.ac.in", password: "Password123!", name: "Dr. Priya Sharma" },
    { email: "prof.rajan.kumar@mlrit.ac.in", password: "Password123!", name: "Prof. Rajan Kumar" },
    { email: "aanya.reddy@student.mlrit.ac.in", password: "Password123!", name: "Aanya Reddy" },
    { email: "vikram.singh@student.mlrit.ac.in", password: "Password123!", name: "Vikram Singh" },
    { email: "meera.patel@student.mlrit.ac.in", password: "Password123!", name: "Meera Patel" },
    { email: "arjun.nair@student.mlrit.ac.in", password: "Password123!", name: "Arjun Nair" },
    { email: "divya.krishna@student.mlrit.ac.in", password: "Password123!", name: "Divya Krishna" },
];

async function createUser(user) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "apikey": SERVICE_ROLE_KEY,
            "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
            email: user.email,
            password: user.password,
            email_confirm: true,          // skip confirmation email
            user_metadata: { full_name: user.name },
        }),
    });

    const data = await res.json();

    if (!res.ok) {
        // If user already exists, that's fine
        if (data.msg?.includes("already") || data.code === "email_exists") {
            console.log(`⚠️  Already exists: ${user.email}`);
        } else {
            console.error(`❌ Failed: ${user.email}`, data);
        }
    } else {
        console.log(`✅ Created: ${user.email}  (id: ${data.id})`);
    }
}

for (const user of users) {
    await createUser(user);
}

console.log("\nDone. Now run your seed SQL in Supabase Dashboard.");