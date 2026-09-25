'use client';

import { useRef } from 'react';
import { useMotion, gsap } from '@/lib/motion';
import type { Trip } from '@/lib/trip';

/**
 * The meter animates to its new width whenever someone joins or answers, so the
 * change is visible rather than just present on the next render.
 */
export function PeoplePanel({ trip, selfName }: { trip: Trip; selfName?: string }) {
  const ready = trip.members.filter(member => member.submitted).length;
  const total = trip.members.length;
  const fill = total ? (ready / total) * 100 : 0;
  const root = useRef<HTMLElement>(null);

  useMotion(root, ({ reduced }) => {
    gsap.to('.meter span', {
      width: `${fill}%`,
      duration: reduced ? 0 : 0.7,
      ease: 'power2.out',
    });
  }, [fill]);

  return (
    <section className="panel" ref={root}>
      <div className="panel-head">
        <h2>Who is in</h2>
        <p className="tally numeric"><strong>{ready}</strong> of {total} answered</p>
      </div>

      <div className="meter">
        <span style={{ width: 0 }} />
      </div>

      <ul className="people">
        {trip.members.map((member, index) => (
          <li className="person" key={`${member.name}-${index}`}>
            <span className="avatar" aria-hidden="true">{member.name.slice(0, 1).toUpperCase()}</span>
            <span className="name">
              {member.name}
              {selfName === member.name && <em> (you)</em>}
            </span>
            <span className={member.submitted ? 'person-state ready' : 'person-state'} />
            <span className="visually-hidden">{member.submitted ? 'has answered' : 'has not answered yet'}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
