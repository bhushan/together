'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { SiteHeader, SiteFooter } from '@/components/site-chrome';
import { Toast } from '@/components/toast';
import { PeoplePanel } from '@/components/trip/people-panel';
import { AnswerPanel } from '@/components/trip/answer-panel';
import { OptionsPanel } from '@/components/trip/options-panel';
import { NextStepCard } from '@/components/trip/next-step-card';
import type { AnswerForm, Trip } from '@/lib/trip';
import type { RoundStatus, StepContext } from '@/lib/steps';
import ridges from '@/assets/img/ridges.jpg';

const EMPTY_FORM: AnswerForm = {
  origin: '', startDate: '', endDate: '', budget: '',
  destinationType: 'any', excludedDestinations: '', preferences: '', dealbreakers: '',
};

const DONE_MESSAGE: Record<string, string> = {
  submit: 'Your answers are saved. Your private link lets you change them later.',
  vote: 'Vote saved. You can change it until the organiser locks a choice.',
  lock: 'Locked in. That is the trip.',
  generate: 'The round is ready.',
};

export default function TripPage() {
  const { slug } = useParams<{ slug: string }>();
  const [secret, setSecret] = useState('');
  const [trip, setTrip] = useState<Trip | null>(null);
  const [name, setName] = useState('');
  const [form, setForm] = useState<AnswerForm>(EMPTY_FORM);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [lockChoice, setLockChoice] = useState('');

  const load = useCallback(async (key: string) => {
    try {
      const response = await fetch(`/api/trips/${slug}`, {
        headers: key ? { 'x-member-token': key } : {},
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setTrip(data);
      if (data.self) {
        setForm({
          origin: data.self.origin || '',
          startDate: data.self.startDate || '',
          endDate: data.self.endDate || '',
          budget: String(data.self.budget || ''),
          destinationType: data.self.destinationType || 'any',
          excludedDestinations: (data.self.excludedDestinations || []).join(', '),
          preferences: data.self.preferences || '',
          dealbreakers: data.self.dealbreakers || '',
        });
      }
      setLockChoice(data.round?.locked_option_id || data.round?.options?.[0]?.id || '');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'This trip could not be opened.');
    }
  }, [slug]);

  useEffect(() => {
    const match = location.hash.match(/^#(?:member|organizer)=([A-Za-z0-9_-]+)$/);
    const key = match?.[1] || '';
    setSecret(key);
    void load(key);
  }, [load]);

  async function act(action: string, payload: Record<string, unknown> = {}) {
    setBusy(action);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/trips/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(secret ? { 'x-member-token': secret } : {}) },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (data.token) {
        location.hash = `member=${data.token}`;
        setSecret(data.token);
        await load(data.token);
      } else {
        await load(secret);
        setNotice(DONE_MESSAGE[action] || 'Saved.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That did not go through. Try again.');
    } finally {
      setBusy('');
    }
  }

  async function copy(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    setError('');
    setNotice(`${label} copied.`);
  }

  const groupLink = typeof window === 'undefined' ? '' : `${location.origin}/trip/${slug}`;
  const privateLink = typeof window === 'undefined' || !secret
    ? ''
    : `${location.origin}/trip/${slug}#${trip?.organizer ? 'organizer' : 'member'}=${secret}`;

  const ready = trip?.members.filter(member => member.submitted).length ?? 0;
  const stepContext: StepContext = {
    joined: !!trip?.self,
    submitted: !!trip?.self?.submitted,
    readyCount: ready,
    memberCount: trip?.members.length ?? 0,
    organizer: !!trip?.organizer,
    roundStatus: (trip?.round?.status as RoundStatus) ?? 'none',
    hasVoted: !!trip?.round?.myVote,
    stale: !!trip?.round?.stale,
  };

  return (
    <div className="page">
      <div className="trip-masthead">
        <div className="band">
          <Image src={ridges} alt="" placeholder="blur" quality={72} sizes="100vw" />
        </div>
        <SiteHeader />

        {trip && (
          <div className="masthead-body shell">
            <div>
              <h1 className="display-lg">{trip.title}</h1>
              <p className="prose">The trip takes shape as everyone adds their piece.</p>
            </div>
            <div className="share">
              <span>Group link (anyone with it can join)</span>
              <code>{groupLink}</code>
              <button className="btn-link" onClick={() => copy(groupLink, 'Group link')}>Copy the group link</button>
            </div>
          </div>
        )}
      </div>

      {!trip ? (
        <div className="loading shell">
          {error ? <p className="error-text">{error}</p> : <p>Opening the trip…</p>}
        </div>
      ) : (
        <div className="trip-body shell">
          <div className="trip-main">
            <PeoplePanel trip={trip} selfName={trip.self?.name} />

            {!trip.self && (
              <section className="panel">
                <div className="panel-head"><h2>Join this trip</h2></div>
                <p className="prose">
                  Add your name and you get a private link of your own for editing your answers and voting.
                </p>
                <form
                  className="join-form"
                  onSubmit={event => {
                    event.preventDefault();
                    void act('join', { name });
                  }}
                >
                  <label className="field">
                    <span className="visually-hidden">Your name</span>
                    <input value={name} maxLength={50} onChange={event => setName(event.target.value)} placeholder="Your name" required />
                  </label>
                  <button className="btn btn-primary" disabled={!!busy}>
                    {busy === 'join' ? 'Joining…' : 'Join the trip'}
                  </button>
                </form>
              </section>
            )}

            <AnswerPanel
              trip={trip}
              form={form}
              onChange={setForm}
              onSubmit={() => void act('submit', form)}
              busy={busy}
              privateLink={privateLink}
              onCopyPrivate={() => copy(privateLink, 'Private link')}
            />

            <OptionsPanel
              trip={trip}
              busy={busy}
              lockChoice={lockChoice}
              onLockChoiceChange={setLockChoice}
              onVote={optionId => void act('vote', { optionId })}
              onLock={() => void act('lock', { optionId: lockChoice })}
            />
          </div>

          <aside className="trip-aside">
            <NextStepCard
              context={stepContext}
              busy={busy}
              onGenerate={() => void act('generate')}
              onInvite={() => copy(groupLink, 'Group link')}
            />

            <section className="aside-note">
              <h2>How options are checked</h2>
              <p>
                Shared dates, every person’s budget and every excluded destination are enforced
                against live flight and hotel prices before a destination is shown at all.
              </p>
            </section>

            {trip.previousRounds.length > 0 && (
              <section className="aside-note">
                <h2>Earlier rounds</h2>
                <ul>
                  {trip.previousRounds.map(round => (
                    <li key={round.id}>
                      <span>{new Date(round.createdAt).toLocaleDateString()}</span>
                      <span>{round.lockedChoice ?? round.status}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
      )}

      {(notice || (error && trip)) && (
        <Toast
          message={error || notice}
          tone={error ? 'error' : 'info'}
          onDismiss={() => { setError(''); setNotice(''); }}
        />
      )}

      <SiteFooter />
    </div>
  );
}
