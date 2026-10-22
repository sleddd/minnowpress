# MinnowPress

**Little stories, endless sequels.** · [minnowpress.com](https://minnowpress.com)

MinnowPress is a home for very short fiction, written by people NOT AI. Every story is 1,024 characters or less, about a hundred and fifty words, short enough to read before your tea cools. And no story has to stay alone: anyone can write a **prequel** or a **sequel** to anyone else's story, so a single small story can grow into a branching chain written by many hands.

It carries on the idea behind [Ficlets](https://ficlets.com) (2006–2009) and [Ficly](https://ficly.com) (2009–2014), and brings Ficly's public archive back to life so those stories can be read, rated and continued again.

<img width="1146" height="716" alt="Screenshot 2026-10-21 at 10 30 28 PM" src="https://github.com/user-attachments/assets/78811956-ca40-4225-93b0-fa8a7761572d" />
<img width="1095" height="713" alt="Screenshot 2026-10-21 at 10 31 14 PM" src="https://github.com/user-attachments/assets/59419acd-37b4-44ac-9771-f83843e469cb" />
<img width="1119" height="715" alt="Screenshot 2026-10-21 at 10 30 53 PM" src="https://github.com/user-attachments/assets/af758b48-0b24-4a3d-9d17-39025cc9aee1" />
<img width="1130" height="713" alt="Screenshot 2026-10-21 at 10 30 40 PM" src="https://github.com/user-attachments/assets/68e1219e-58ed-4992-a62a-c4a7b4674aff" />
<img width="732" height="711" alt="Screenshot 2026-10-21 at 10 32 29 PM" src="https://github.com/user-attachments/assets/6f6b0f72-40c9-447a-8890-0702d84a319f" />

## Written by people

This is the one rule that shapes everything else:

- **Every story, comment and bio is written by a person.** AI never writes, edits, autocompletes, suggests wording for, or comments on anyone's writing. Stories that are AI-generated are removed, and readers can report any story they suspect.

## The Ficly archive

Ficly's stories were published under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/), and the founders released a public export. MinnowPress imports it:

- **31,984 stories**, **1,343 challenges** and **11,295 prequel/sequel links**, with tags and fish ratings.
- Each story is credited to its original author, with a link back to ficly.com, and every author has a page listing their stories.
- Archive stories can't be edited, but anyone can write a prequel or sequel to them.
- Comments aren't imported: they were conversations with people who can't reply here.

If you wrote on Ficly and would rather your stories weren't here, get in touch and they'll be taken down.

## With thanks

Ficly was built by **Kevin Lawver** and **Jason Garber** as the successor to AOL's Ficlets, at a time when writing on the web was still wonderfully simple. MinnowPress wouldn't exist without the community they gathered and the archive they chose to keep public. Out of respect for their request that successors not reuse the Ficly name, this project has its own.

## Running it locally

You'll need Node.js 24 or later.

```sh
npm install
cp .env.example .env     # the defaults work for local development
npm run db:migrate       # creates local.db
npm run dev              # http://localhost:5173
```

To sign in, enter any email address at `/login`. In development no email is sent; the sign-in link is printed in the terminal. Put your address in `ADMIN_EMAILS` in `.env` **before** your first sign-in to get the admin role.

To load the Ficly archive (about four seconds; safe to run again):

```sh
curl -LO https://raw.githubusercontent.com/ficly/ficly_export/master/db/ficly_export.sql.gz
npm run import:ficly -- ficly_export.sql.gz
```

AI prompt suggestions are off until you add Amazon Bedrock credentials (see [Deploying](#deploying-to-minnowpresscom)). Everything else works without them.

## How it's built

| Part      | Choice                                                                                      |
| --------- | ------------------------------------------------------------------------------------------- |
| Framework | [SvelteKit](https://svelte.dev) 3 with Svelte 5 and TypeScript                              |
| Database  | SQLite: [Turso](https://turso.tech) in production, a local file in development, via Drizzle |
| Hosting   | [Vercel](https://vercel.com), with Vercel Cron for scheduled jobs                           |
| Sign-in   | Email link or **passkey** (WebAuthn). No passwords.                                         |
| Email     | [Resend](https://resend.com)                                                                |
| Prompts   | Claude on Amazon Bedrock, for challenge suggestions only                                    |

### Design system

The UI follows **strict atomic design** in `src/lib/components/`: atoms → molecules → organisms → templates → pages. Each level may only use the levels below it, pages contain no raw HTML (they compose a template), and every component has its own test beside it. The linter enforces the levels, and Stylelint requires every color, size and space to come from the design tokens in `src/lib/styles/tokens.css`. The look follows classic Ficly: a sage frame, a teal ribbon, italic serif titles, dashed rules and luggage-tag tags, with light, dark and automatic themes.

### Server code

Business logic lives in `src/lib/server/` as plain functions that take the database as their first argument (`stories`, `ratings`, `challenges`, `feeds`, `moderation`, `moderation-log`, `auth`, `passkeys` and so on). Route files stay thin: read the form, call a function, show the result. Tests run against an in-memory database with the real migrations. The busy pages read from summaries rather than scanning the archive: an indexed `popularity` column SQLite derives itself, per-tag story counts, an `archive_authors` table, and an FTS5 index for search, all rebuilt by the nightly job.

### Tests

`npm run ci` runs everything the project requires before a change goes in:

- type checking
- Prettier, ESLint and Stylelint
- a check that every component and module has a test
- unit and component tests in a real browser, with accessibility checks and coverage minimums
- end-to-end tests with Playwright, including passkey sign-in

| Script                               | What it does                              |
| ------------------------------------ | ----------------------------------------- |
| `npm run dev`                        | Development server                        |
| `npm run ci`                         | Every check and test                      |
| `npm run test:unit`                  | Unit and component tests (watch mode)     |
| `npm run test:e2e`                   | End-to-end tests against a fresh `e2e.db` |
| `npm run db:generate` / `db:migrate` | Create / apply database migrations        |
| `npm run import:ficly -- <file>`     | Import the Ficly archive                  |

### Security and privacy

- **No passwords.** Sign-in links are single-use, expire after 15 minutes, and need a button press to use, so email scanners can't spend them. Requests are rate-limited per network and per email.
- **Short sessions.** Everyone is signed out two days after signing in. Settings lists every device you're signed in on, and can sign out the others.
- **Nothing usable is stored.** The database holds only hashes of sign-in tokens and sessions.
- **Strict Content Security Policy** with no third-party scripts, plus HSTS and the usual security headers. Story text is always shown as text, never as HTML.
- **No tracking, no ads, no view counts.**

## Deploying to minnowpress.com

1. **Database.** Create a Turso database (and a separate one for preview deployments).
2. **Prompts (optional).** In AWS, enable a Claude model in Amazon Bedrock and create an IAM user whose only permission is `bedrock:InvokeModel` on that model (and on its inference profile, such as `us.anthropic.claude-opus-4-6-v1`). Create an access key for it.
3. **Environment variables** in the Vercel project:

   | Variable                                                     | Value                                                          |
   | ------------------------------------------------------------ | -------------------------------------------------------------- |
   | `DATABASE_URL`, `DATABASE_AUTH_TOKEN`                        | From Turso                                                     |
   | `PUBLIC_ORIGIN`                                              | `https://minnowpress.com` (used in emails, feeds and passkeys) |
   | `PUBLIC_APP_NAME`                                            | `MinnowPress`                                                  |
   | `RESEND_API_KEY`, `EMAIL_FROM`                               | From Resend, e.g. `MinnowPress <hello@minnowpress.com>`        |
   | `EMAIL_REPLY_TO`                                             | Optional: where replies to emails go                           |
   | `ADMIN_EMAILS`                                               | Your email address                                             |
   | `CRON_SECRET`                                                | A long random string                                           |
   | `BEDROCK_AWS_ACCESS_KEY_ID`, `BEDROCK_AWS_SECRET_ACCESS_KEY` | The IAM user's key (leave unset to turn suggestions off)       |
   | `BEDROCK_AWS_REGION`, `BEDROCK_MODEL`                        | e.g. `us-west-2` and `us.anthropic.claude-opus-4-6-v1`         |

   The AWS variables start with `BEDROCK_` because Vercel reserves the usual `AWS_*` names.

4. **Import the archive** (optional) against Turso:

   ```sh
   DATABASE_URL=libsql://… DATABASE_AUTH_TOKEN=… npm run import:ficly -- ficly_export.sql.gz
   ```

5. **Push.** Vercel applies any pending migrations (`scripts/migrate.ts`, run by the build command in `vercel.json`), then builds and deploys. To migrate by hand instead: `DATABASE_URL=libsql://… DATABASE_AUTH_TOKEN=… npm run db:migrate`. `vercel.json` schedules the challenge job daily (00:05 UTC), summary maintenance daily (00:30 UTC), and the email digest on Mondays. The Active feed is rescored on the visit, when a page that shows it finds the scores more than five minutes old. Each job requires `Authorization: Bearer $CRON_SECRET`.

Keep the Turso token, Vercel account, GitHub account and the email inbox behind two-factor sign-in: together they are the keys to the site.

## License

**The code** is copyright 2026 Claudette Raynor and licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE.md). In plain terms:

- **You can** read it, run it, change it, remix it, and contribute improvements back, as long as it's for noncommercial purposes: personal projects, study, hobby use, teaching, research, or charities and public institutions.
- **You can** share your changed version noncommercially, as long as you include the license and the `Required Notice` line at the top of [LICENSE.md](LICENSE.md).
- **You can't** use it, or anything built from it, for commercial purposes: selling it, running it as a paid or ad-supported service, or using it in a business.

This summary is for convenience; [LICENSE.md](LICENSE.md) is what actually applies. For commercial use, ask first.

**The stories** are licensed separately from the code. Stories published on MinnowPress are shared under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), and stories from the Ficly archive keep their original [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) license.
