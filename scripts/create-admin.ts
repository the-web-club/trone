import { config } from "dotenv";
config({ path: ".env.local" });

import { auth } from "../src/lib/auth";

function readRequired(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") {
    throw new Error(`Ontbrekende environment variable: ${name}`);
  }
  return value;
}

async function main() {
  const name = readRequired("INITIAL_ADMIN_NAME");
  const email = readRequired("INITIAL_ADMIN_EMAIL");
  const password = readRequired("INITIAL_ADMIN_PASSWORD");

  if (password.length < 12 || password.length > 128) {
    throw new Error(
      "INITIAL_ADMIN_PASSWORD moet tussen 12 en 128 tekens lang zijn.",
    );
  }

  try {
    const result = await auth.api.createUser({
      body: {
        name,
        email,
        password,
        role: "admin",
      },
    });

    console.log("Beheerder aangemaakt.");
    console.log(`E-mailadres: ${result.user.email}`);
    console.log("Rol: admin");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Onbekende fout";

    if (
      message.toLowerCase().includes("already") ||
      message.toLowerCase().includes("exists") ||
      message.includes("USER_ALREADY_EXISTS")
    ) {
      console.log("Beheerder bestond al. Geen nieuwe gebruiker aangemaakt.");
      process.exit(0);
    }

    console.error("Aanmaken van beheerder mislukt.");
    console.error(message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Aanmaken van beheerder mislukt.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
