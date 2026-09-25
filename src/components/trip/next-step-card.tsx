'use client';

import { nextStep, type StepContext } from '@/lib/steps';

/** The five beats of a trip, used to show how far along this one is. */
const BEATS = ['join', 'submit', 'invite', 'round', 'decide'] as const;

/**
 * How many beats this trip has cleared. A trip can run a round before the last
 * person answers, so take the furthest beat reached rather than counting them:
 * progress that goes dark in the middle reads as a bug, not as nuance.
 */
function beatsCleared(context: StepContext) {
  const everyoneIn = context.readyCount >= context.memberCount && context.memberCount >= 2;
  const cleared = [
    context.joined,
    context.submitted,
    everyoneIn,
    context.roundStatus !== 'none',
    context.roundStatus === 'locked',
  ];
  return cleared.reduce((furthest, done, index) => (done ? index + 1 : furthest), 0);
}

type Props = {
  context: StepContext;
  busy: string;
  onGenerate: () => void;
  onInvite: () => void;
};

export function NextStepCard({ context, busy, onGenerate, onInvite }: Props) {
  const step = nextStep(context);
  const cleared = beatsCleared(context);

  return (
    <section className="step-card">
      <div className="step-dots" aria-hidden="true">
        {BEATS.map((beat, index) => <i key={beat} className={index < cleared ? 'done' : undefined} />)}
      </div>
      <h2>{step.title}</h2>
      <p>{step.detail}</p>

      {step.cta === 'generate' && (
        <button className="btn btn-primary btn-block" disabled={!!busy} onClick={onGenerate}>
          {busy === 'generate' ? 'Checking live prices…' : context.roundStatus === 'none' ? 'Find options' : 'Run a fresh round'}
        </button>
      )}
      {step.cta === 'invite' && (
        <button className="btn btn-primary btn-block" onClick={onInvite}>Copy the group link</button>
      )}
    </section>
  );
}
