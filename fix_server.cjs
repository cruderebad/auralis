const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf-8');

serverCode = serverCode.replace(
`  const getAdminSupabase = () => {
    return createClient(
      process.env.VITE_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
    );
  };`,
`  const getAdminSupabase = () => {
    const url = process.env.VITE_SUPABASE_URL || "https://dummy.supabase.co";
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "dummy_key";
    
    if (url === "https://dummy.supabase.co" || key === "dummy_key") {
      console.warn("⚠️ Server Supabase Warning: Using dummy credentials. Auth and DB will fail.");
    }
    
    return createClient(url, key);
  };`
);

fs.writeFileSync('server.ts', serverCode);
console.log("Server updated.");
