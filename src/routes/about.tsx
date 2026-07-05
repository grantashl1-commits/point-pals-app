import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Heart, Bone, Sparkles, Scale } from "lucide-react";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "Why PointPals works — the research" },
      {
        name: "description",
        content:
          "How real-world rewards help modern families build routines — grounded in attachment theory, chore research, and an honest look at motivation science.",
      },
    ],
  }),
});

function AboutPage() {
  return (
    <article className="mx-auto max-w-2xl pb-12 space-y-8">
      <header>
        <h1 className="font-display text-4xl font-bold">
          The real reason PointPals works
        </h1>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          PointPals isn't a behaviour-modification system that happens to live in an app. It's a
          counter-cultural tool for families who want to build real-world habits in a world designed
          to pull their kids in the opposite direction. Here's the research that shaped it — the
          good, the messy, and the honest.
        </p>
      </header>

      {/* ── Section 1 ── */}
      <Section icon={<Bone className="h-5 w-5" />} title="The crisis ordinary families are up against">
        <p>
          Your child's brain is being systematically hijacked by products engineered for compulsive
          use. Michaeleen Doucleff, in <em>Dopamine Kids</em>, documents how smartphones, social
          media, and ultra-processed foods exploit the dopamine reward system — creating altered
          pleasure baselines that make ordinary life feel unsatisfying. The discontentment parents
          see in their children is partly neurological. It's not a willpower problem. It's a systems
          problem.
        </p>
        <p>
          One of the most counterintuitive findings: using screen time as a reward for behaviour
          backfires. It elevates screens to a uniquely desirable status and increases the child's
          fixation on them. The very strategy most parents reach for{" "}
          <em>amplifies the problem it tries to solve</em>.
        </p>
        <p>
          Doucleff's research with Maya, Inuit, and Hadzabe communities found children who are
          cooperative, emotionally regulated, and genuinely content — without structured{" "}
          <em>any</em> entertainment or behavioural rewards. Their secret? Integration into adult
          life. Contribution. Being genuinely needed. That's the north star.
        </p>
      </Section>

      {/* ── Section 2 ── */}
      <Section icon={<Heart className="h-5 w-5" />} title="Attachment is the foundation. Everything else sits on top.">
        <p>
          Gordon Neufeld and Gabor Maté, in <em>Hold On to Your Kids</em>, make a claim that
          changed how we think about PointPals: <strong>parenting effectiveness doesn't depend
          primarily on what parents do, but on who they are to the child</strong>. Discipline,
          guidance, influence — all of it flows from a secure attachment relationship. When that
          relationship is strong, children naturally take on their parents' values. When it's
          damaged, no technique in the world will stick.
        </p>
        <p>
          The same theme runs through Adele Faber and Elaine Mazlish's <em>How to Talk So Kids Will
          Listen</em>: children cannot hear problem-solving until they feel heard. Validating a
          child's feelings — before giving advice or correction — dramatically increases their
          openness to communication. Acknowledging before advising. Connection before correction.
        </p>
        <p>
          Hunter Clarke-Fields, in <em>Raising Good Humans</em>, frames this as mindful listening
          — being fully present instead of jumping to fix everything. And Brené Brown, in{" "}
          <em>Daring Greatly</em>, reminds us that showing our kids our humanity — imperfection,
          vulnerability, the willingness to apologise — teaches them more about strength than any
          polished performance ever could.
        </p>
        <p className="rounded-2xl bg-sage/25 p-4 text-sm">
          <strong>What this means for PointPals:</strong> The points are not the point. The
          <em>relationship</em> is the point. The app is a tool for connection — a shared project,
          a conversation starter, a way to notice and celebrate effort together. If the points ever
          replace genuine warmth, you're using it wrong.
        </p>
      </Section>

      {/* ── Section 3 ── */}
      <Section icon={<Sparkles className="h-5 w-5" />} title="Chores build capability. That's the real point.">
        <p>
          Julie Lythcott-Haims, in <em>How to Raise an Adult</em>, draws on her decades as a
          Stanford dean — watching capable eighteen-year-olds arrive unable to manage basic adult
          tasks. Her research-backed conclusion: children who do regular household chores grow into
          more capable, collaborative adults. Chores communicate something fundamental:{" "}
          <strong>you are a contributing member of this family, not a passenger</strong>.
        </p>
        <p>
          Frances Jensen, in <em>The Teenage Brain</em>, adds a neurological layer: the adolescent
          brain is the most efficient learning machine that will ever exist in that individual. The
          teen drive toward risk is not a design flaw — it's an evolutionary adaptation that drives
          exploration and identity formation. The goal isn't to eliminate risk but to channel it
          wisely. Routine habits — chores, self-care, contribution — build the executive function
          scaffolding that makes wise risk-taking possible.
        </p>
        <p>
          Kevin Leman, in <em>Have a New Kid by Friday</em>, makes the same case from a different
          angle: children learn best from <em>reality consequences</em>. When a parent removes
          themselves from the role of punisher and lets natural outcomes teach the lesson,
          children develop genuine accountability. Real competence comes from real contribution.
        </p>
      </Section>

      {/* ── Section 4 ── */}
      <Section icon={<BookOpen className="h-5 w-5" />} title="Why real-world rewards matter right now">
        <p>
          This is where PointPals fits. The established evidence for structured reinforcement of
          everyday routines is strong — the Triple P program (101 studies, over 16,000 families)
          found significant improvements in child behaviour and parenting practices. The Incredible
          Years program shows similar effects for reducing disruptive behaviour. And token
          economies, as formalised by Ayllon and Azrin and reviewed by Kazdin, have reliably
          increased desired behaviours across classrooms and homes for decades.
        </p>
        <p>
          But the more urgent argument is this: <strong>children today are drowning in digital
          rewards</strong> — likes, streaks, loot boxes, variable-ratio reinforcement schedules
          designed by engineers to maximise engagement. A child who earns a point on a chart for
          brushing their teeth is receiving a <em>real-world</em> reward. Tangible. Concrete.
          Tied to an actual accomplishment that they can see, touch, and feel proud of. It's a
          small act of resistance against an economy of abstract, engineered pleasure.
        </p>
        <p>
          Doucleff's key insight — that rewarding behaviour with screen time backfires — makes the
          case for <em>physical</em> tracking. The point jar that fills up. The chime that marks
          completion. The family seeing progress together. These are analogue rewards in a digital
          age, and that's exactly what makes them work.
        </p>
      </Section>

      {/* ── Section 5 ── */}
      <Section icon={<Scale className="h-5 w-5" />} title="The honest counter-argument">
        <p>
          There's a real debate about extrinsic rewards, and it deserves a real answer. Deci,
          Koestner and Ryan's 1999 meta-analysis found that tangible, expected rewards can
          undermine intrinsic motivation — the overjustification effect. Self-determination theory
          argues that when you reward someone for something they already loved doing, they can come
          to do it only for the reward.
        </p>
        <p>
          The important nuance — and it's a crucial one — is that this effect is strongest for
          tasks a person <em>already finds intrinsically rewarding</em>. Most chores and self-care
          routines aren't in that category. Reviews such as Cameron, Banko and Pierce (2001) note
          that for tasks with low initial interest, rewards generally help rather than harm —
          especially when tied to competence and delivered warmly.
        </p>
        <p>
          Julie Schwartz Gottman and John Gottman, in <em>Fight Right</em>, would add that
          conflicts about chores — and every family has them — are never really about the chores.
          They're about respect, fairness, and feeling alone in the work. PointPals doesn't solve
          those deeper issues, but it <em>does</em> create a shared reference point for the
          conversation: "I noticed you emptied the dishwasher. Thank you." That's a bid for
          connection. And Gottman's research shows that turning toward those bids is the most
          powerful preventive for major conflict.
        </p>
      </Section>

      {/* ── Section 6 ── */}
      <Section icon={<Heart className="h-5 w-5" />} title="How to use it well">
        <p>
          Every source we've read agrees on one thing: the healthiest path is to{" "}
          <strong>fade the rewards as habits form</strong>. This is standard practice in the
          token-economy literature — thin the reinforcement over time and let natural consequences
          take over. A tidy room. Pride. A smoother morning. That's the real reward.
        </p>
        <p className="rounded-2xl bg-sage/25 p-4 text-sm">
          <strong>A gentle note from Abbey Wedgeworth, <em>Help! I'm Ruining My Kids</em>:</strong>{" "}
          Your kids need you — a real, imperfect you who sometimes gets it wrong and knows how to
          repair — not a perfect, consistent system. PointPals is a tool, not a substitute for your
          presence. If you miss a day, if the points aren't perfectly tracked, if your child loses
          interest and you have to start again — that's not failure. That's parenting. Repair the
          connection and keep going.
        </p>
        <p>Practically, as a routine becomes automatic, we suggest:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Name the intrinsic payoff.</strong> Alongside the points, say it out loud:
            "Your room feels calmer now." "We got out the door on time because you were ready."
            This bridges external motivation to internal satisfaction.
          </li>
          <li>
            <strong>Use descriptive feedback, not evaluative praise.</strong>{"" /* thanks, Faber & Mazlish */}
            Instead of "you're so good," try "you cleared the table without being asked. That
            really helped the family." Specificity builds genuine self-concept.
          </li>
          <li>
            <strong>Let established habits graduate.</strong> When a behaviour has become second
            nature, that's success. Move it off the board to make room for new challenges.
          </li>
          <li>
            <strong>Stay warm and stay firm.</strong> The research consensus across every source
            we've read is clear: authoritative parenting — high warmth, clear expectations —
            outperforms every other style. Love freely, hold limits consistently.
          </li>
        </ul>
      </Section>

      <section className="border-t border-border pt-6">
        <h2 className="font-display text-lg font-bold">Further reading</h2>
        <p className="text-sm text-muted-foreground mt-2">
          These books shaped the thinking behind PointPals. They're worth reading in full:
        </p>
        <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground list-disc pl-5">
          <li>
            <em>Hold On to Your Kids</em> — Gordon Neufeld and Gabor Maté
          </li>
          <li>
            <em>How to Talk So Kids Will Listen</em> — Adele Faber and Elaine Mazlish
          </li>
          <li>
            <em>Dopamine Kids</em> — Michaeleen Doucleff
          </li>
          <li>
            <em>How to Raise an Adult</em> — Julie Lythcott-Haims
          </li>
          <li>
            <em>Raising Good Humans</em> — Hunter Clarke-Fields
          </li>
          <li>
            <em>Daring Greatly</em> — Brené Brown
          </li>
          <li>
            <em>Have a New Kid by Friday</em> — Kevin Leman
          </li>
          <li>
            <em>The Teenage Brain</em> — Frances Jensen
          </li>
          <li>
            <em>Help! I'm Ruining My Kids</em> — Abbey Wedgeworth
          </li>
          <li>
            <em>Fight Right</em> — Julie Schwartz Gottman and John Gottman
          </li>
        </ul>
        <h3 className="font-display text-base font-bold mt-6">Selected academic references</h3>
        <ol className="mt-2 space-y-1.5 text-sm text-muted-foreground list-decimal pl-5">
          <li>
            Ayllon, T., &amp; Azrin, N. H. (1968).{" "}
            <em>The Token Economy: A Motivational System for Therapy and Rehabilitation</em>.
          </li>
          <li>
            Kazdin, A. E., &amp; Bootzin, R. R. (1972). The token economy: An evaluative review.{" "}
            <em>Journal of Applied Behavior Analysis, 5</em>(3), 343–372.
          </li>
          <li>
            Sanders, M. R., et al. (2014). The Triple P-Positive Parenting Program: A systematic
            review and meta-analysis. <em>Clinical Psychology Review, 34</em>(4), 337–357.
          </li>
          <li>
            Deci, E. L., Koestner, R., &amp; Ryan, R. M. (1999). A meta-analytic review of
            experiments examining the effects of extrinsic rewards on intrinsic motivation.{" "}
            <em>Psychological Bulletin, 125</em>(6), 627–668.
          </li>
          <li>
            Cameron, J., Banko, K. M., &amp; Pierce, W. D. (2001). Pervasive negative effects of
            rewards on intrinsic motivation: The myth continues.{" "}
            <em>The Behavior Analyst, 24</em>(1), 1–44.
          </li>
        </ol>
        <p className="mt-4 text-xs text-muted-foreground">
          PointPals is a habit-building tool, not medical or psychological advice. For clinical
          concerns about a child's behaviour, speak with a qualified professional.
        </p>
      </section>
    </article>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
        <span className="text-foreground/70">{icon}</span>
        {title}
      </h2>
      <div className="space-y-3 leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}
