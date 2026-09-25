'use client';

import { Horizon } from '@/components/horizon';
import { isBlocking, money, type Option, type Round, type Self } from '@/lib/trip';

type Props = {
  option: Option;
  round: Round;
  currency: string;
  self: Self | null;
  busy: string;
  onVote: (optionId: string) => void;
};

export function OptionCard({ option, round, currency, self, busy, onVote }: Props) {
  const chosen = round.locked_option_id === option.id;
  const passedOver = round.status === 'locked' && !chosen;
  const votes = round.tally[option.id] || 0;
  const canVote = self && round.status === 'ready' && !round.stale;
  const myFlightLink = self ? option.quote.flightLinks[self.id] : undefined;

  return (
    <article className={['option', chosen && 'is-chosen', passedOver && 'is-passed-over'].filter(Boolean).join(' ')}>
      <figure className="option-horizon">
        <Horizon seed={`${option.city}, ${option.country}`} />
        {chosen && <span className="chosen-marker">The group’s choice</span>}
        <figcaption>
          <h3>
            {option.city}
            <span>{option.destination_type} trip in {option.country}</span>
          </h3>
          <p className="fit numeric">
            <strong>{option.score}%</strong>
            <span>group fit</span>
          </p>
        </figcaption>
      </figure>

      <div className="option-body">
        <p className="prose">{option.reason}</p>

        <div className="quote">
          <div>
            <span>Whole group, all in</span>
            <strong className="numeric">{money(currency, option.total_cost)}</strong>
          </div>
          <div>
            <span>Hotel quoted</span>
            <strong>{option.quote.hotelName}</strong>
          </div>
        </div>

        <ul className="positions">
          {option.positions.map(position => (
            <li key={position.memberId}>
              <span className="who">{position.name}</span>
              <span className={isBlocking(position.position) ? 'verdict is-blocking' : 'verdict'}>
                {position.position}
              </span>
              <span className="amount numeric">
                {position.cost === null ? 'No price' : money(currency, position.cost)}
                <small>budget {money(currency, position.budget)}</small>
              </span>
            </li>
          ))}
        </ul>

        <div className="option-actions">
          <span className="votes">{votes === 1 ? '1 vote' : `${votes} votes`}</span>
          {canVote && (
            <button className="btn btn-quiet" disabled={!!busy} onClick={() => onVote(option.id)}>
              {round.myVote === option.id ? 'Your vote, change it' : 'Vote for this'}
            </button>
          )}
        </div>

        <p className="fine source-note">
          Flight and hotel prices from Google Travel via SerpApi, checked{' '}
          {new Date(option.quote.quotedAt).toLocaleString()}. Availability moves, so treat these as
          estimates. <a href={option.quote.hotelLink} target="_blank" rel="noreferrer">Compare hotels</a>
          {myFlightLink && <>, <a href={myFlightLink} target="_blank" rel="noreferrer">compare your flights</a></>}
        </p>
      </div>
    </article>
  );
}
