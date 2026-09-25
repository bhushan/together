'use client';

import { useRef } from 'react';
import { useMotion, gsap } from '@/lib/motion';
import { OptionCard } from './option-card';
import type { Trip } from '@/lib/trip';

type Props = {
  trip: Trip;
  busy: string;
  lockChoice: string;
  onLockChoiceChange: (optionId: string) => void;
  onVote: (optionId: string) => void;
  onLock: () => void;
};

export function OptionsPanel({ trip, busy, lockChoice, onLockChoiceChange, onVote, onLock }: Props) {
  const round = trip.round;
  const root = useRef<HTMLElement>(null);
  const ready = trip.members.filter(member => member.submitted).length;

  // Options arrive as the answer to pressing "Find options", so they are dealt
  // out rather than simply appearing, and a locked choice gets its marker swept
  // in on the end of the same timeline.
  //
  // One timeline, not two: a second context animating opacity on these same
  // cards fights the entrance and can strand them invisible. Anything that
  // outlives the entrance (the receded look of a passed-over option) is left to
  // CSS, and clearProps hands the elements back to it.
  useMotion(root, ({ reduced }) => {
    if (reduced || !round?.options.length) return;
    const timeline = gsap.timeline();
    timeline.from('.option', {
      opacity: 0, y: 24, duration: 0.6, stagger: 0.12, ease: 'power3.out',
      clearProps: 'opacity,transform',
    });
    if (round.locked_option_id) {
      timeline.from('.option.is-chosen .chosen-marker', {
        scaleX: 0, transformOrigin: 'left center', duration: 0.5, ease: 'power3.out',
      }, '-=0.25');
    }
  }, [round?.id, round?.locked_option_id]);

  return (
    <section className="panel" ref={root}>
      <div className="panel-head">
        <h2>What fits everyone</h2>
        {round && <span className="fine">Checked {new Date(round.created_at).toLocaleDateString()}</span>}
      </div>

      {!round && (
        <p className="empty">
          {ready === trip.members.length && trip.members.length >= 2
            ? 'Everyone has answered. The organiser can check live prices now.'
            : 'Options appear once at least two people have joined and everyone has answered.'}
        </p>
      )}

      {round?.stale && (
        <p className="note note-quiet">
          Someone joined or changed their answers after this round was checked. The organiser can run
          a fresh one; this round stays in the history either way.
        </p>
      )}

      {round?.status === 'conflict' && (
        <div className="note note-warn">
          <strong>Nothing cleared everyone’s limits</strong>
          <ul>
            {round.issues.map((issue, index) => <li key={index}>{issue}</li>)}
          </ul>
        </div>
      )}

      {round && round.options.length > 0 && (
        <div className="options">
          {round.options.map(option => (
            <OptionCard
              key={option.id}
              option={option}
              round={round}
              currency={trip.currency}
              self={trip.self}
              busy={busy}
              onVote={onVote}
            />
          ))}
        </div>
      )}

      {round?.status === 'ready' && trip.organizer && (
        <div className="lock-row">
          <label className="field">
            <span className="visually-hidden">Option to lock in</span>
            <select value={lockChoice} onChange={event => onLockChoiceChange(event.target.value)}>
              {round.options.map(option => (
                <option key={option.id} value={option.id}>
                  {option.city}, {round.tally[option.id] || 0} votes
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn-ink" disabled={!!busy || !lockChoice || round.stale} onClick={onLock}>
            {busy === 'lock' ? 'Locking…' : 'Lock the group’s choice'}
          </button>
        </div>
      )}

      <p className="fine source-note">
        Only destinations with a live round-trip flight price for every origin and a bookable group
        hotel are shown. Booking sites may quote differently by the time you get there.
      </p>
    </section>
  );
}
