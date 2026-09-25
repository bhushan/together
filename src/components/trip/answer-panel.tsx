'use client';

import type { AnswerForm, Trip } from '@/lib/trip';

const STYLES = [
  ['any', 'Open to anything'],
  ['beach', 'Beach'],
  ['city', 'City'],
  ['nature', 'Nature'],
  ['adventure', 'Adventure'],
  ['culture', 'Culture'],
] as const;

type Props = {
  trip: Trip;
  form: AnswerForm;
  onChange: (form: AnswerForm) => void;
  onSubmit: () => void;
  busy: string;
  privateLink: string;
  onCopyPrivate: () => void;
};

export function AnswerPanel({ trip, form, onChange, onSubmit, busy, privateLink, onCopyPrivate }: Props) {
  const self = trip.self;
  if (!self) return null;
  const set = (patch: Partial<AnswerForm>) => onChange({ ...form, ...patch });

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{self.submitted ? 'Your answers' : 'What works for you'}</h2>
      </div>
      <p className="prose">
        Dates, budget and excluded destinations are treated as hard limits. The two notes at the
        bottom are passed along as guidance, so check them with the group before anyone books.
      </p>

      <form
        className="answer-form"
        onSubmit={event => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="field-row">
          <label className="field">
            <span>Flying from <span className="hint">airport code</span></span>
            <input
              required
              maxLength={3}
              placeholder="DEL"
              value={form.origin}
              onChange={event => set({ origin: event.target.value.toUpperCase() })}
            />
          </label>
          <label className="field">
            <span>Most you can spend <span className="hint">{trip.currency}, per person</span></span>
            <input
              required
              type="number"
              min="1"
              placeholder="1200"
              value={form.budget}
              onChange={event => set({ budget: event.target.value })}
            />
          </label>
        </div>

        <div className="field-row">
          <label className="field">
            <span>Earliest you can leave</span>
            <input required type="date" value={form.startDate} onChange={event => set({ startDate: event.target.value })} />
          </label>
          <label className="field">
            <span>Latest you must be back</span>
            <input required type="date" value={form.endDate} onChange={event => set({ endDate: event.target.value })} />
          </label>
        </div>

        <label className="field">
          <span>Kind of trip you want</span>
          <select value={form.destinationType} onChange={event => set({ destinationType: event.target.value })}>
            {STYLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>

        <label className="field">
          <span>Anywhere that is a no <span className="hint">separate with commas</span></span>
          <input
            placeholder="Goa, Thailand"
            value={form.excludedDestinations}
            onChange={event => set({ excludedDestinations: event.target.value })}
          />
        </label>

        <label className="field">
          <span>What would make this trip for you</span>
          <textarea rows={3} placeholder="Good food, slow mornings, somewhere to swim" value={form.preferences} onChange={event => set({ preferences: event.target.value })} />
        </label>

        <label className="field">
          <span>Anything else that rules a place out</span>
          <textarea rows={2} placeholder="No overnight layovers" value={form.dealbreakers} onChange={event => set({ dealbreakers: event.target.value })} />
        </label>

        <button className="btn btn-primary" disabled={!!busy}>
          {busy === 'submit' ? 'Saving…' : self.submitted ? 'Save changes' : 'Send my answers'}
        </button>
      </form>

      <div className="private-link">
        <div>
          <p><strong>Your private link</strong></p>
          <p className="fine">Keep it to yourself. Anyone who has it can edit your answers and vote as you.</p>
        </div>
        <button type="button" className="btn-link" onClick={onCopyPrivate} disabled={!privateLink}>
          Copy private link
        </button>
      </div>
    </section>
  );
}
