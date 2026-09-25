import test from 'node:test';
import assert from 'node:assert/strict';
import { nextStep, type StepContext } from '../src/lib/steps';

const base: StepContext = {
  joined: true, submitted: true, readyCount: 3, memberCount: 3,
  organizer: false, roundStatus: 'none', hasVoted: false, stale: false,
};
const step = (patch: Partial<StepContext>) => nextStep({ ...base, ...patch });

test('a visitor who has not joined is asked to join first', () => {
  assert.equal(step({ joined: false, submitted: false }).id, 'join');
});

test('joining outranks every later prompt', () => {
  assert.equal(step({ joined: false, submitted: false, roundStatus: 'ready' }).id, 'join');
});

test('a member without answers is asked for them before anything else', () => {
  assert.equal(step({ submitted: false }).id, 'submit');
  assert.equal(step({ submitted: false, readyCount: 2 }).id, 'submit');
});

test('a waiting group is pointed at the people still missing', () => {
  const waiting = step({ readyCount: 2, memberCount: 3 });
  assert.equal(waiting.id, 'invite');
  assert.match(waiting.detail, /1 (person|people)/);
  assert.match(step({ readyCount: 1, memberCount: 3 }).detail, /2 people/);
});

test('a group of one is still waiting for company, not for options', () => {
  assert.equal(step({ readyCount: 1, memberCount: 1 }).id, 'invite');
});

test('only the organiser is offered the generate action', () => {
  assert.equal(step({ organizer: true }).cta, 'generate');
  assert.equal(step({ organizer: false }).cta, 'none');
  assert.equal(step({ organizer: false }).id, 'await-round');
});

test('a ready round asks for a vote, then confirms once it is cast', () => {
  assert.equal(step({ roundStatus: 'ready' }).id, 'vote');
  assert.equal(step({ roundStatus: 'ready', hasVoted: true }).id, 'voted');
  assert.equal(step({ roundStatus: 'ready', hasVoted: true }).cta, 'none');
});

test('a stale round asks the organiser for a fresh one instead of a vote', () => {
  assert.equal(step({ roundStatus: 'ready', stale: true, organizer: true }).id, 'regenerate');
  assert.equal(step({ roundStatus: 'ready', stale: true, organizer: true }).cta, 'generate');
  assert.equal(step({ roundStatus: 'ready', stale: true }).id, 'regenerate');
  assert.equal(step({ roundStatus: 'ready', stale: true }).cta, 'none');
});

test('a conflict round explains itself and offers the organiser a retry', () => {
  assert.equal(step({ roundStatus: 'conflict' }).id, 'conflict');
  assert.equal(step({ roundStatus: 'conflict', organizer: true }).cta, 'generate');
});

test('a locked round is the end of the line for everyone', () => {
  for (const organizer of [true, false]) {
    const locked = step({ roundStatus: 'locked', organizer });
    assert.equal(locked.id, 'locked');
    assert.equal(locked.cta, 'none');
  }
});

test('every step says something in both its title and its detail', () => {
  const contexts: Partial<StepContext>[] = [
    { joined: false }, { submitted: false }, { readyCount: 2 }, {}, { organizer: true },
    { roundStatus: 'ready' }, { roundStatus: 'ready', hasVoted: true },
    { roundStatus: 'ready', stale: true }, { roundStatus: 'conflict' }, { roundStatus: 'locked' },
  ];
  for (const context of contexts) {
    const result = step(context);
    assert.ok(result.title.trim().length > 0, `${result.id} has no title`);
    assert.ok(result.detail.trim().length > 0, `${result.id} has no detail`);
  }
});
