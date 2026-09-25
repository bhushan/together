import { Hero } from '@/components/home/hero';
import { CreateTripForm } from '@/components/home/create-trip-form';
import { SiteFooter } from '@/components/site-chrome';

const STEPS = [
  {
    title: 'Share one link',
    body: 'Create the trip and drop the link in the group chat. Anyone who opens it can join, however many of you there are.',
  },
  {
    title: 'Everyone answers once',
    body: 'Where they fly from, the dates that work, what they can spend, and anywhere that is a no. Each person can edit their own answers later.',
  },
  {
    title: 'Vote on what actually fits',
    body: 'Options come back checked against live flight and hotel prices. The group votes, the organiser locks one in.',
  },
];

export default function Home() {
  return (
    <div className="page">
      <Hero />

      <section className="start shell">
        <div className="start-grid">
          <div className="start-copy">
            <h2 className="display-lg">Different cities, different budgets, one trip that works for all of them.</h2>
            <p className="lede">
              Group trips fall apart in the gap between “we should go somewhere” and anyone actually
              checking whether it works. Together closes that gap.
            </p>
            <p className="prose">
              Everyone’s dates, budgets and no-go destinations land in one place. What comes back has
              already been checked against all of them and against live flight and hotel prices, so
              nobody discovers on the booking page that it was never going to work.
            </p>
          </div>

          <CreateTripForm />
        </div>
      </section>

      <section className="sequence shell" id="how">
        <h2 className="display-md">How it works</h2>
        <ol className="sequence-list">
          {STEPS.map(step => (
            <li key={step.title}>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <SiteFooter />
    </div>
  );
}
