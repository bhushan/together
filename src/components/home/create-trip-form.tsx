'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const CURRENCIES = [
  ['USD', 'US dollar'],
  ['INR', 'Indian rupee'],
  ['EUR', 'Euro'],
  ['GBP', 'British pound'],
  ['AUD', 'Australian dollar'],
  ['CAD', 'Canadian dollar'],
] as const;

export function CreateTripForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, name, currency }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      router.push(`/trip/${data.slug}#organizer=${data.token}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The trip could not be created. Try again.');
      setBusy(false);
    }
  }

  return (
    <div className="create-card">
      <h2>Start a trip</h2>
      <form onSubmit={create}>
        <label className="field">
          <span>Trip name</span>
          <input required maxLength={80} placeholder="Winter reunion" value={title} onChange={event => setTitle(event.target.value)} />
        </label>

        <label className="field">
          <span>Your name</span>
          <input required maxLength={50} placeholder="How your friends know you" value={name} onChange={event => setName(event.target.value)} />
        </label>

        <label className="field">
          <span>Currency for everyone’s budgets</span>
          <select value={currency} onChange={event => setCurrency(event.target.value)}>
            {CURRENCIES.map(([code, label]) => (
              <option key={code} value={code}>{code}, {label}</option>
            ))}
          </select>
        </label>

        {error && <p className="error-text" role="alert">{error}</p>}

        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Creating the trip…' : 'Create the trip'}
        </button>
      </form>

      <p className="fine create-foot">
        No account needed. You get an organiser link; everyone who joins gets their own private link.
      </p>
    </div>
  );
}
