/**
 * A trip is a sequence, and at any moment exactly one thing moves it forward.
 * This works out what that thing is so the interface can say it plainly
 * instead of leaving everyone to guess whose turn it is.
 */

export type RoundStatus = 'none' | 'ready' | 'conflict' | 'locked';

export type StepContext = {
  joined: boolean;
  submitted: boolean;
  readyCount: number;
  memberCount: number;
  organizer: boolean;
  roundStatus: RoundStatus;
  hasVoted: boolean;
  stale: boolean;
};

export type StepCta = 'join' | 'submit' | 'invite' | 'generate' | 'vote' | 'none';

export type Step = { id: string; title: string; detail: string; cta: StepCta };

const people = (count: number) => (count === 1 ? '1 person' : `${count} people`);

export function nextStep(context: StepContext): Step {
  const { joined, submitted, readyCount, memberCount, organizer, roundStatus, hasVoted, stale } = context;

  if (!joined) {
    return { id: 'join', title: 'Add yourself to the trip', detail: 'Anyone with this link can join. You get a private link to edit your own answers.', cta: 'join' };
  }
  if (!submitted) {
    return { id: 'submit', title: 'Tell the group what works for you', detail: 'Your dates, budget and no-go destinations are treated as hard limits when options are checked.', cta: 'submit' };
  }
  if (roundStatus === 'locked') {
    return { id: 'locked', title: 'The group has picked', detail: 'The organiser locked this choice. Earlier rounds stay in the history below.', cta: 'none' };
  }
  if (roundStatus === 'ready' && stale) {
    return organizer
      ? { id: 'regenerate', title: 'This round is out of date', detail: 'Someone joined or changed their answers after these options were checked. Run a fresh round to include them.', cta: 'generate' }
      : { id: 'regenerate', title: 'This round is out of date', detail: 'Answers changed after these options were checked. The organiser can run a fresh round.', cta: 'none' };
  }
  if (roundStatus === 'ready') {
    return hasVoted
      ? { id: 'voted', title: 'Your vote is in', detail: 'You can change it until the organiser locks the group choice.', cta: 'none' }
      : { id: 'vote', title: 'Pick your favourite', detail: 'Every option below already fits everyone’s dates, budgets and exclusions.', cta: 'vote' };
  }
  if (roundStatus === 'conflict') {
    return organizer
      ? { id: 'conflict', title: 'Nothing cleared the group’s limits', detail: 'The reasons are listed with the options. Loosen a constraint or run the round again.', cta: 'generate' }
      : { id: 'conflict', title: 'Nothing cleared the group’s limits', detail: 'The reasons are listed with the options. Adjusting your own answers may open things up.', cta: 'none' };
  }
  if (readyCount < memberCount || memberCount < 2) {
    const waiting = memberCount - readyCount;
    return {
      id: 'invite',
      title: memberCount < 2 ? 'Bring the rest of the group in' : 'Waiting on the others',
      detail: memberCount < 2
        ? 'Share the group link. Options need at least two people before they mean anything.'
        : `${people(waiting)} still to answer. Share the group link as a nudge.`,
      cta: 'invite',
    };
  }
  return organizer
    ? { id: 'await-round', title: 'Everyone has answered', detail: 'Check live flight and hotel prices against the group’s limits and see what fits.', cta: 'generate' }
    : { id: 'await-round', title: 'Everyone has answered', detail: 'The organiser can now check live prices and bring back options.', cta: 'none' };
}
