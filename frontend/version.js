import fs from "fs";

// Read package.json manually
const pkg = JSON.parse(fs.readFileSync("./package.json", "utf-8"));

const now = new Date();

const timestamp =
  now.getFullYear() +
  "." +
  String(now.getMonth() + 1).padStart(2, "0") +
  "." +
  String(now.getDate()).padStart(2, "0") +
  "." +
  String(now.getHours()).padStart(2, "0") +
  String(now.getMinutes()).padStart(2, "0");

const version = `${pkg.version}+${timestamp}`;

const envPath = ".env";

let envContent = "";
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, "utf-8");
}

// Replace or add version
if (envContent.includes("VITE_APP_VERSION=")) {
  envContent = envContent.replace(
    /VITE_APP_VERSION=.*/,
    `VITE_APP_VERSION=${version}`
  );
} else {
  envContent += `\nVITE_APP_VERSION=${version}`;
}

fs.writeFileSync(envPath, envContent);

console.log("✅ Version generated:", version);