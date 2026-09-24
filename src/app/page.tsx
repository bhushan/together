'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function create(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/trips', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, name, currency }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      router.push(`/trip/${data.slug}#organizer=${data.token}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create trip.'); setBusy(false); }
  }
  return <main className="site-shell home">
    <header className="topbar"><a className="wordmark" href="/">together<span>.</span></a><span className="eyebrow">THE GROUP TRIP STUDIO</span></header>
    <div className="hero-grid"><section className="hero-copy"><div className="index-label"><span className="dot"/> THE NEXT TRIP STARTS HERE</div><h1>Good trips start<br/>with <em>everyone.</em></h1><p className="hero-lede">One link for the group. One place for everyone’s dates, budgets and non-negotiables. A decision you can all get behind.</p><div className="steps"><span>01 &nbsp; INVITE YOUR PEOPLE</span><span>02 &nbsp; FIND THE FIT</span><span>03 &nbsp; VOTE TOGETHER</span></div></section>
    <section className="create-card"><div className="card-kicker">START A NEW TRIP <span>↗</span></div><h2>Where to next?</h2><p>Create your space, then drop the link in your group chat. Anyone with it can join.</p><form onSubmit={create}><label>TRIP NAME<input required maxLength={80} placeholder="Summer escape, reunion, anything..." value={title} onChange={e => setTitle(e.target.value)}/></label><label>YOUR NAME<input required maxLength={50} placeholder="What should your friends call you?" value={name} onChange={e => setName(e.target.value)}/></label><label>GROUP CURRENCY<select value={currency} onChange={e => setCurrency(e.target.value)}><option value="USD">USD · US Dollar</option><option value="INR">INR · Indian Rupee</option><option value="EUR">EUR · Euro</option><option value="GBP">GBP · British Pound</option><option value="AUD">AUD · Australian Dollar</option><option value="CAD">CAD · Canadian Dollar</option></select></label>{error && <p className="error" role="alert">{error}</p>}<button disabled={busy} className="primary">{busy ? 'Creating…' : 'Create group trip'} <span>↗</span></button></form><div className="card-foot">No account needed. Your private edit link stays yours.</div></section></div>
    <footer className="footer"><span>LESS BACK-AND-FORTH. MORE GETTING THERE.</span><span>MADE FOR THE WHOLE GROUP</span></footer>
  </main>;
}
