export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <h1 className="font-display text-3xl font-bold text-foreground">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated September 2026</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground [&_h2]:font-display [&_h2]:mb-2 [&_h2]:mt-0 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1">
        <section>
          <h2>1. What we collect</h2>
          <p>When you use OnWave, we collect:</p>
          <ul>
            <li>Account info: email address, username, and a hashed password (or your Google account identifier, if you sign in with Google — we never see your Google password).</li>
            <li>Profile info you choose to add: display name, bio, location, website, favorite genre, and a profile photo.</li>
            <li>Activity: stations you like or follow, shows/DJs you follow, reminders you set, badges you've been awarded, and stations/shows you've created.</li>
            <li>Chat messages you send in a live show's chat, and standard connection info (like your browser's user agent) needed to run the site and diagnose problems.</li>
            <li>If you broadcast: your microphone/camera/screen-share audio and video, for the duration you're live, relayed through our self-hosted streaming server. We don't record or store this beyond what you explicitly enable (e.g. a clip you save).</li>
          </ul>
        </section>

        <section>
          <h2>2. How we use it</h2>
          <p>
            To run the core features of the site — showing your profile, letting you follow and get notified about
            shows, running live broadcasts and chat, and awarding/displaying badges. We also use your email to send
            account-related messages (password resets, station invites) — never marketing email without your
            request.
          </p>
        </section>

        <section>
          <h2>3. Who else sees it</h2>
          <p>
            Chat messages you send in a live show are visible to everyone else in that show, including after you
            leave. A public profile (the default) is visible to any visitor; you can mark your profile private in
            settings.
          </p>
          <p>We use a small number of external services to run OnWave:</p>
          <ul>
            <li><strong>Resend</strong> — sends transactional emails (password resets, invites) on our behalf. They see the recipient email and message content, not your password or other account data.</li>
            <li><strong>Google</strong> — only if you choose to sign in with Google, to verify your identity.</li>
            <li><strong>radio-browser.info</strong> — the public catalog we search against for stations outside OnWave's own hosted stations. Searching doesn't send your personal data to them.</li>
          </ul>
          <p>
            Error monitoring and live-broadcast infrastructure (chat relay, streaming) run on servers we operate
            ourselves — that data isn't shared with a third party.
          </p>
          <p>We don't sell your data, and we don't share it with advertisers.</p>
        </section>

        <section>
          <h2>4. Your data, your control</h2>
          <p>
            From your profile settings, you can export a copy of your data (profile, follows, badges, shows,
            liked stations, and more) or delete your account entirely. Deleting your account removes your personal
            data; a few things are handled differently by design rather than by omission:
          </p>
          <ul>
            <li>Chat messages you sent in shared streams are kept so the conversation stays intact for other participants, but are reattributed to a generic "deleted user" rather than your identity.</li>
            <li>An independent show you hosted is archived rather than deleted outright, so it doesn't silently break for anyone who'd followed or bookmarked it.</li>
          </ul>
        </section>

        <section>
          <h2>5. Data retention</h2>
          <p>
            We keep your account data for as long as your account exists. Backend error logs (used to catch and fix
            bugs) are retained for a limited window and then automatically deleted.
          </p>
        </section>

        <section>
          <h2>6. Children</h2>
          <p>OnWave isn't directed at children under 13, and we don't knowingly collect data from them.</p>
        </section>

        <section>
          <h2>7. Changes to this policy</h2>
          <p>We may update this policy as the service evolves. Material changes will be reflected here with an updated date.</p>
        </section>

        <section>
          <h2>8. Contact</h2>
          <p>Questions about this policy, or a data request, can be sent through the feedback button available on every page.</p>
        </section>
      </div>
    </div>
  );
}
