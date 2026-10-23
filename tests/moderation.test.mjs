import test from 'node:test';
import assert from 'node:assert/strict';

function calculateSpamScore(totalComplaints, rejectedComplaints) {
  if (!totalComplaints || totalComplaints <= 0) return 0;
  return Math.round((rejectedComplaints / totalComplaints) * 100);
}

function validateBlockAction(callerId, callerRole, targetUserId, targetUserRole, reason) {
  if (callerRole !== 'admin' && callerRole !== 'official') {
    return { valid: false, error: 'Forbidden: Admin or Official privileges required' };
  }
  if (callerId === targetUserId) {
    return { valid: false, error: 'Cannot block your own administrative account' };
  }
  if (targetUserRole === 'admin') {
    return { valid: false, error: 'Cannot block an administrator account' };
  }
  const cleanReason = (reason || 'Repeated portal spam or policy violations').trim();
  return { valid: true, error: null, reason: cleanReason };
}

function checkSubmissionAccess(profile) {
  if (profile?.is_blocked) {
    const reasonText = profile.blocked_reason
      ? `Reason: ${profile.blocked_reason}`
      : 'Reason: Repeated spam, fraudulent submissions, or policy violations.';
    return {
      allowed: false,
      error: `Your reporting access has been suspended by administration. ${reasonText}`,
    };
  }
  return { allowed: true, error: null };
}

test('1. Spam score calculation correctly formats percentages', () => {
  assert.equal(calculateSpamScore(10, 5), 50);
  assert.equal(calculateSpamScore(4, 1), 25);
  assert.equal(calculateSpamScore(0, 0), 0);
  assert.equal(calculateSpamScore(3, 3), 100);
});

test('2. Admin cannot block their own account', () => {
  const result = validateBlockAction('admin-1', 'admin', 'admin-1', 'admin', 'Spam');
  assert.equal(result.valid, false);
  assert.match(result.error, /own administrative account/i);
});

test('3. Admin cannot block another admin account', () => {
  const result = validateBlockAction('admin-1', 'admin', 'admin-2', 'admin', 'Spam');
  assert.equal(result.valid, false);
  assert.match(result.error, /administrator account/i);
});

test('4. Standard citizen is not permitted to execute block action', () => {
  const result = validateBlockAction('citizen-1', 'citizen', 'citizen-2', 'citizen', 'Spam');
  assert.equal(result.valid, false);
  assert.match(result.error, /Forbidden/i);
});

test('5. Admin can successfully block a spamming citizen with custom reason', () => {
  const result = validateBlockAction(
    'admin-1',
    'admin',
    'citizen-123',
    'citizen',
    'Flooded portal with 20 fake pothole photos'
  );
  assert.equal(result.valid, true);
  assert.equal(result.reason, 'Flooded portal with 20 fake pothole photos');
});

test('6. Blocked citizen submission attempt is rejected with suspension reason', () => {
  const access = checkSubmissionAccess({
    id: 'citizen-123',
    is_blocked: true,
    blocked_reason: 'Spamming duplicate reports',
  });
  assert.equal(access.allowed, false);
  assert.match(access.error, /suspended by administration/i);
  assert.match(access.error, /Spamming duplicate reports/i);
});

test('7. Active citizen submission access is granted', () => {
  const access = checkSubmissionAccess({
    id: 'citizen-456',
    is_blocked: false,
  });
  assert.equal(access.allowed, true);
  assert.equal(access.error, null);
});
