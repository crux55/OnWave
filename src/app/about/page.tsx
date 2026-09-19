'use client';

import Link from 'next/link';
import { Search, Heart, Mic2, Radio, MessagesSquare, Tv, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuickTipsDialog } from '@/components/QuickTipsDialog';

const FEATURES = [
  {
    icon: Search,
    title: 'Find your sound',
    body: "Thousands of stations from everywhere, sorted the way you actually think about music — by genre, not just by name. Jazz at 2am, drive-time talk, a station from a country you've never been to. It's all in here.",
  },
  {
    icon: Heart,
    title: 'Follow what you love',
    body: 'Found a station that gets it? A show that’s never missed? A DJ whose taste you trust? Follow them, and OnWave keeps you in the loop — new episodes, upcoming shows, the moment they go live.',
  },
  {
    icon: Mic2,
    title: 'Become a DJ',
    body: "Every station started with someone who just wanted to share what they were listening to. If that's you, apply to become a DJ — your own show, your own sound, your own audience.",
  },
  {
    icon: Radio,
    title: 'Go live',
    body: "Plan a set ahead of time, or go live on the spot. Talk, play music, take the mic — audio or video, your call. OnWave carries the signal; you bring the sound.",
  },
  {
    icon: Tv,
    title: 'Watch others go live',
    body: "Drop into a live broadcast from a station or DJ you follow and listen or watch along in real time — see who else showed up, right there with you.",
  },
  {
    icon: MessagesSquare,
    title: 'Talk while it plays',
    body: "Every live show has a chat running alongside it. React to the song that just came on, say hi to the DJ, meet the regulars who show up every week same as you.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
      <QuickTipsDialog />
      {/* Hero */}
      <section
        className="relative mb-14 overflow-hidden rounded-2xl border border-border/60 p-8 text-center sm:p-14"
        style={{
          background:
            'radial-gradient(120% 140% at 15% 0%, hsl(var(--accent-2) / 0.28), transparent 60%), ' +
            'radial-gradient(120% 140% at 90% 100%, hsl(var(--accent) / 0.24), transparent 55%), ' +
            'hsl(var(--card))',
        }}
      >
        <span className="text-xs font-bold uppercase tracking-wider text-accent">Welcome to OnWave</span>
        {/* h2, not h1 — the site header's AppLogo already owns the page's h1
            (see AppLogo.tsx), matching how other pages here treat their top
            heading as an h2. */}
        <h2 className="font-display mt-3 text-3xl font-bold text-foreground sm:text-5xl">
          Some things you never stop loving.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Maybe it's the song that came on right when you needed it, on a drive that should
          have been forgettable. Maybe it's a late-night host who felt like the only other
          person awake. Radio has always been like that — a stranger's voice, a signal
          reaching you from somewhere else, and somehow, company. OnWave is that feeling,
          still going, just built for how people actually listen now.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="rounded-full">
            <Link href="/discover">
              Start listening <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full">
            <Link href="/live">See who's live</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="mb-14">
        <h2 className="font-display mb-8 text-center text-2xl font-bold text-foreground sm:text-3xl">
          What you can do here
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-border/60 bg-card/60 p-6 transition-colors hover:border-accent/40"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing / emotional note */}
      <section className="mb-14 rounded-2xl border border-border/60 bg-card/40 p-8 text-center sm:p-10">
        <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
          Every station on here is somebody's old love — a sound they couldn't leave behind,
          or one they're building from scratch because no one else was playing what they
          wanted to hear. That's the whole idea: not an algorithm deciding what you should
          feel, but real people, playing real music, live, for anyone who happens to be
          listening. Turn it on. See what finds you.
        </p>
      </section>

      {/* Final CTA */}
      <section className="text-center">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="rounded-full">
            <Link href="/discover">
              Explore stations <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full">
            <Link href="/profile">Finish setting up your profile</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
