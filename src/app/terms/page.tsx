export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <h1 className="font-display text-3xl font-bold text-foreground">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated September 2026</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground [&_h2]:font-display [&_h2]:mb-2 [&_h2]:mt-0 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1">
        <section>
          <h2>1. What OnWave is</h2>
          <p>
            OnWave is a service for discovering internet radio stations, following stations/shows/DJs, and
            broadcasting or listening to live audio and video streams hosted through the platform. By creating an
            account or using the site, you agree to these terms.
          </p>
        </section>

        <section>
          <h2>2. Accounts</h2>
          <p>
            You need an account to follow, chat, broadcast, or manage a station. You're responsible for keeping
            your login credentials secure and for activity that happens under your account. You must provide an
            accurate email address, and you may not create an account on someone else's behalf without permission.
          </p>
        </section>

        <section>
          <h2>3. Content you bring or broadcast</h2>
          <p>
            OnWave doesn't provide, host, or license the music or content you play when broadcasting — you're
            responsible for anything you stream, including making sure you have the right to play it (your own
            license, a station's license, or content you own). Before going live, broadcasters must confirm they
            accept responsibility for their own content, which this section formalizes.
          </p>
          <p>
            You may not use OnWave to broadcast or upload content that's illegal, infringes someone else's rights,
            harasses or threatens others, or otherwise violates these terms. Chat messages, badges, station
            profiles, and anything else you post are subject to the same standard.
          </p>
        </section>

        <section>
          <h2>4. Moderation</h2>
          <p>
            Station and show moderators can mute, time out, or remove chat participants and messages within their
            own streams. OnWave admins can additionally end a live broadcast immediately if it violates these
            terms, with a reason recorded against that broadcast for accountability.
          </p>
        </section>

        <section>
          <h2>5. Stations, DJ status, and badges</h2>
          <p>
            Creating a station or becoming a DJ on OnWave goes through an application that OnWave reviews before
            approval — we can decline or revoke either at our discretion, including for violating these terms.
            Badges awarded on OnWave are for fun and community recognition; they don't represent any official
            status, certification, or affiliation beyond what's stated on the badge itself.
          </p>
        </section>

        <section>
          <h2>6. Account deletion</h2>
          <p>
            You can delete your account at any time from your profile settings. Deleting your account removes your
            personal data as described in the Privacy Policy; some content you contributed to shared spaces (like
            chat history in a stream others took part in) may be retained in de-identified form rather than deleted
            outright, so the conversation stays intact for everyone else who was part of it.
          </p>
        </section>

        <section>
          <h2>7. Availability</h2>
          <p>
            OnWave is provided as-is, without guarantees of uptime or availability. Features may change, and the
            service may be modified, suspended, or discontinued at any time.
          </p>
        </section>

        <section>
          <h2>8. Changes to these terms</h2>
          <p>
            We may update these terms as the service evolves. Continuing to use OnWave after a change means you
            accept the updated terms.
          </p>
        </section>

        <section>
          <h2>9. Contact</h2>
          <p>Questions about these terms can be sent through the feedback button available on every page.</p>
        </section>
      </div>
    </div>
  );
}
