const fs = require('fs');

let authContextCode = fs.readFileSync('src/context/AuthContext.tsx', 'utf-8');

authContextCode = authContextCode.replace(
`import { supabase } from '../lib/supabase';`,
`import { supabase, verifySupabaseConfig } from '../lib/supabase';`
);

authContextCode = authContextCode.replace(
`  useEffect(() => {
    // Check if we are in a popup`,
`  useEffect(() => {
    verifySupabaseConfig();
    // Check if we are in a popup`
);

fs.writeFileSync('src/context/AuthContext.tsx', authContextCode);
console.log("AuthContext updated.");
