import Link from "next/link";
export default function Setup() {
  return (
    <main className="setup-page">
      <Link href="/">← Back to Afield</Link>
      <span className="eyebrow">CONNECT WHEN YOU ARE READY</span>
      <h1>
        A small setup.
        <br />
        Your own reading room.
      </h1>
      <p>
        Local development can be reviewed before adding any secret keys. Only
        Supabase and Gemini are needed for live direct-source research. Do not
        paste keys into chat or share screenshots containing them.
      </p>
      <h2>1. Supabase: your saved space</h2>
      <p>
        The project is already created. In its dashboard, open Settings → API
        Keys. Put a server <strong>secret key</strong> into{" "}
        <code>SUPABASE_SECRET_KEY</code> in the ignored local{" "}
        <code>.env.local</code> file. Public project settings are already
        filled. Keep email confirmation enabled and use your admitted
        organization-member email. Use exact localhost and deployed callback
        URLs.
      </p>
      <h2>2. Gemini: understanding and narration</h2>
      <p>
        In{" "}
        <a
          href="https://aistudio.google.com/api-keys"
          target="_blank"
          rel="noreferrer noopener"
        >
          Google AI Studio
        </a>
        , create a dedicated Free Tier project{" "}
        <strong>without linked billing</strong>. Copy its key directly into{" "}
        <code>GEMINI_API_KEY</code> locally. Check free access to the configured
        text, speech, and audio-understanding models before enabling generation.
        Use public subjects and non-confidential context.
      </p>
      <h2>3. Start with direct sources</h2>
      <p>
        Put public URLs into your Explore request, or add public RSS feeds and
        pages to a topic. You can skip Tavily. It only adds broader web
        discovery. Without it, Afield checks the sources you supply; it does not
        perform broad web search. RSS and approved-site scopes can find articles
        within those sources.
      </p>
      <h2>4. Keep execution local at first</h2>
      <p>
        Leave <code>EXECUTION_MODE=local</code>. Once configured, start the
        local worker in a separate terminal. You can skip Trigger.dev until you
        want jobs and schedules to run while your Mac is off. Cloud hosting and
        cloud workers have separate environments. A hosted app can serve
        admitted testers using your local worker, but new jobs wait whenever
        your Mac or worker is off. Localhost itself is only available on your
        Mac.
      </p>
      <h2>5. Verify the free path</h2>
      <p>
        Leave live generation disabled until keys and free account status are
        checked. Then set the local verification and generation switches to true
        and restart. Start with one short text brief. Audio is generated only
        when you press Generate audio; verified saved narration is reused. A
        listening-time estimate becomes verified only after audio is requested
        and measured. No trial, payment method, paid fallback, or account
        rotation is needed.
      </p>
      <div className="notice">
        The full illustrated-by-steps reference is in the local project:{" "}
        <code>docs/KEYS-AND-SETUP.md</code>. It covers exact variable names,
        sign-in, optional accounts, hosting, and key revocation.
      </div>
      <p>
        Your keys stay on the server. Your briefs, evidence, and audio stay
        behind account checks and private storage.
      </p>
    </main>
  );
}
