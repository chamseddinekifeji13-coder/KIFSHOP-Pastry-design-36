import { execSync } from "child_process";
console.log("Installing Supabase dependencies...");
try {
  const result = execSync("pnpm add @supabase/ssr @supabase/supabase-js", {
    cwd: "/vercel/share/v0-project",
    encoding: "utf-8",
    stdio: "pipe",
  });
  console.log(result);
  console.log("Done!");
} catch (e) {
  console.error("Install error:", e.message);
  console.error("stderr:", e.stderr);
}
