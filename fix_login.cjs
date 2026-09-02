const fs = require('fs');

let authContextCode = fs.readFileSync('src/context/AuthContext.tsx', 'utf-8');
authContextCode = authContextCode.replace(
`  const signInWithPassword = async (username: string, password: string) => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    try {
      const res = await fetch('/api/auth/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      if (!res.ok) {
        throw new Error('Invalid username or password');
      }
      const data = await res.json();
      const resolvedEmail = data.email;

      const { error } = await supabase.auth.signInWithPassword({ email: resolvedEmail, password });
      if (error) throw error;
    } catch (error) {
      console.error('Error signing in with password:', error);
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  };`,
`  const signInWithPassword = async (username: string, password: string) => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    try {
      let resolvedEmail = username;
      if (!username.includes('@')) {
        const res = await fetch('/api/auth/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username })
        });
        if (!res.ok) {
          throw new Error('Invalid username or password');
        }
        const data = await res.json();
        resolvedEmail = data.email;
      }

      const { error } = await supabase.auth.signInWithPassword({ email: resolvedEmail, password });
      if (error) throw error;
    } catch (error) {
      console.error('Error signing in with password:', error);
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  };`
);

fs.writeFileSync('src/context/AuthContext.tsx', authContextCode);

let authModalCode = fs.readFileSync('src/components/AuthModal.tsx', 'utf-8');
authModalCode = authModalCode.replace(
`                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    required`,
`                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username or Email"
                    required`
);

fs.writeFileSync('src/components/AuthModal.tsx', authModalCode);
console.log("Login logic updated.");
