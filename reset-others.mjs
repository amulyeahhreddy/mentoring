// reset-others.mjs
const SUPABASE_URL = "https://dnymnrceocbsgirwzphj.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRueW1ucmNlb2Nic2dpcnd6cGhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzk2NjkxMiwiZXhwIjoyMDkzNTQyOTEyfQ.abKxoLXTrLMZcxtq9sKo2CCTjogFxKtLJg2HPsyuXsQ";

const users = [
    { id: "aaaaaaaa-0002-0002-0002-000000000002", email: "prof.rajan.kumar@mlrit.ac.in" },
    { id: "bbbbbbbb-0001-0001-0001-000000000001", email: "aanya.reddy@student.mlrit.ac.in" },
    { id: "bbbbbbbb-0002-0002-0002-000000000002", email: "vikram.singh@student.mlrit.ac.in" },
    { id: "bbbbbbbb-0003-0003-0003-000000000003", email: "meera.patel@student.mlrit.ac.in" },
    { id: "bbbbbbbb-0004-0004-0004-000000000004", email: "arjun.nair@student.mlrit.ac.in" },
    { id: "bbbbbbbb-0005-0005-0005-000000000005", email: "divya.krishna@student.mlrit.ac.in" },
];

for (const user of users) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "apikey": SERVICE_ROLE_KEY,
            "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ password: "Password123!" }),
    });
    const data = await res.json();
    if (res.ok) console.log(`✅ Password set: ${user.email}`);
    else console.error(`❌ Failed: ${user.email}`, data);
}