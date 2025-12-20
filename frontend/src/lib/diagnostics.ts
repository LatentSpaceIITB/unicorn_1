/**
 * After-Action Report (AAR) Diagnostic Analysis
 *
 * Rule-based pattern detection to identify failure archetypes
 * and provide actionable feedback to players.
 */

export interface Tags {
  intent: string;
  modifier: string;
  tone: string;
  topic: string;
  flags: string[];
}

export interface StatChanges {
  vibe: number;
  trust: number;
  tension: number;
}

export interface StatsAfter {
  vibe: number;
  trust: number;
  tension: number;
}

export interface CriticalEvent {
  turn_number: number;
  event_type: string;
  description: string;
  stat_impact: string;
}

export interface DetailedTurn {
  turn_number: number;
  user_input: string;
  chloe_response: string;
  tags: Tags;
  stat_changes: StatChanges;
  stats_after: StatsAfter;
  intuition_hint: string | null;
  critical_event: CriticalEvent | null;
}

export type DiagnosticSeverity = 'critical' | 'high' | 'medium' | 'low' | 'success';

export interface DiagnosticItem {
  code: string;
  title: string;
  description: string;
  severity: DiagnosticSeverity;
  turnNumber?: number;
  details?: string;
}

interface FinalStats {
  vibe: number;
  trust: number;
  tension: number;
}

// ============================================================================
// Pattern Detectors
// ============================================================================

/**
 * THE SIMP - Validation Seeker
 * Trigger: Used Validate intent >= 2x OR Validate when Vibe > 60
 */
function detectSimpPattern(history: DetailedTurn[]): DiagnosticItem[] {
  const diagnostics: DiagnosticItem[] = [];

  const validateTurns = history.filter(t => t.tags.intent === 'Validate');
  const validateWhenHighVibe = history.find(
    t => t.tags.intent === 'Validate' && t.stats_after.vibe > 60
  );

  if (validateTurns.length >= 2) {
    diagnostics.push({
      code: 'ERR_VALIDATION_DEPENDENCY',
      title: 'THE SIMP',
      description: `You sought validation ${validateTurns.length} times. Confidence is attractive; insecurity is not.`,
      severity: 'high',
      turnNumber: validateTurns[0]?.turn_number,
    });
  } else if (validateWhenHighVibe) {
    diagnostics.push({
      code: 'ERR_VALIDATION_DEPENDENCY',
      title: 'THE SIMP',
      description: 'You sought approval when things were going well. Trust yourself.',
      severity: 'medium',
      turnNumber: validateWhenHighVibe.turn_number,
    });
  }

  // Check for excessive apologizing
  const apologizeTurns = history.filter(t => t.tags.intent === 'Apologize');
  const apologizeWhenHighVibe = apologizeTurns.find(
    t => t.stats_after.vibe > 50
  );

  if (apologizeWhenHighVibe) {
    diagnostics.push({
      code: 'ERR_OVER_APOLOGIZING',
      title: 'OVER-APOLOGIZER',
      description: 'You apologized when things were fine. Stop undermining yourself.',
      severity: 'medium',
      turnNumber: apologizeWhenHighVibe.turn_number,
    });
  }

  return diagnostics;
}

/**
 * THE CREEP - Bad Timing
 * Trigger: Escalate intent when Trust < 30
 */
function detectCreepPattern(history: DetailedTurn[]): DiagnosticItem[] {
  const diagnostics: DiagnosticItem[] = [];

  // Find escalation before trust threshold
  const earlyEscalation = history.find(
    t => t.tags.intent === 'Escalate' && t.stats_after.trust < 30
  );

  if (earlyEscalation) {
    diagnostics.push({
      code: 'ERR_PREMATURE_ESCALATION',
      title: 'THE CREEP',
      description: `Attempted intimacy at Trust ${earlyEscalation.stats_after.trust} (threshold: 30). Build rapport first.`,
      severity: 'critical',
      turnNumber: earlyEscalation.turn_number,
      details: `Turn ${earlyEscalation.turn_number + 1}: "${earlyEscalation.user_input.slice(0, 50)}..."`,
    });
  }

  // Check for risky flirting too early
  const riskyFlirtEarly = history.find(
    t => t.tags.intent === 'Flirt' && t.tags.modifier === 'Risky' && t.stats_after.trust < 40
  );

  if (riskyFlirtEarly && !earlyEscalation) {
    diagnostics.push({
      code: 'ERR_RISKY_FLIRT_EARLY',
      title: 'TOO FORWARD',
      description: `Risky flirting before comfort was established. Trust was only ${riskyFlirtEarly.stats_after.trust}.`,
      severity: 'high',
      turnNumber: riskyFlirtEarly.turn_number,
    });
  }

  // Check for boundary violations (from flags)
  const boundaryViolation = history.find(
    t => t.tags.flags.includes('content_violation') || t.tags.flags.includes('harassment')
  );

  if (boundaryViolation) {
    diagnostics.push({
      code: 'ERR_BOUNDARY_VIOLATION',
      title: 'BOUNDARY CROSSED',
      description: 'Content flagged as inappropriate. Respect boundaries.',
      severity: 'critical',
      turnNumber: boundaryViolation.turn_number,
    });
  }

  return diagnostics;
}

/**
 * THE NPC - Boring/Generic
 * Trigger: >50% Generic modifier
 */
function detectNPCPattern(history: DetailedTurn[]): DiagnosticItem[] {
  const diagnostics: DiagnosticItem[] = [];

  if (history.length === 0) return diagnostics;

  const genericCount = history.filter(t => t.tags.modifier === 'Generic').length;
  const genericPercent = Math.round((genericCount / history.length) * 100);

  if (genericPercent > 50) {
    diagnostics.push({
      code: 'ERR_GENERIC_RESPONSES',
      title: 'THE NPC',
      description: `${genericPercent}% of responses were generic. Be specific, be memorable.`,
      severity: genericPercent > 70 ? 'high' : 'medium',
      details: `${genericCount}/${history.length} turns were Generic`,
    });
  }

  // Check for too many safe plays
  const safeCount = history.filter(t => t.tags.modifier === 'Safe').length;
  const safePercent = Math.round((safeCount / history.length) * 100);

  if (safePercent > 60 && genericPercent <= 50) {
    diagnostics.push({
      code: 'WARN_TOO_SAFE',
      title: 'PLAYING SAFE',
      description: `${safePercent}% safe responses. Sometimes you need to take risks.`,
      severity: 'low',
    });
  }

  return diagnostics;
}

/**
 * Rank-Specific Pattern Detection
 */
function detectRankSpecificPatterns(
  history: DetailedTurn[],
  rank: string,
  finalStats: FinalStats
): DiagnosticItem[] {
  const diagnostics: DiagnosticItem[] = [];

  // F-RANK specific
  if (rank === 'F') {
    // Trust crash detection
    const trustCrash = history.find(t => t.stat_changes.trust < -20);
    if (trustCrash) {
      diagnostics.push({
        code: 'ERR_TRUST_CRASH',
        title: 'TRUST DESTROYED',
        description: `Trust dropped ${Math.abs(trustCrash.stat_changes.trust)} points in a single turn.`,
        severity: 'critical',
        turnNumber: trustCrash.turn_number,
      });
    }

    if (finalStats.trust <= 0) {
      diagnostics.push({
        code: 'ERR_ZERO_TRUST',
        title: 'NO TRUST',
        description: 'Trust hit zero. She felt unsafe and left.',
        severity: 'critical',
      });
    }
  }

  // D-RANK specific (Friend Zone)
  if (rank === 'D') {
    // Never used risky modifier
    const riskyCount = history.filter(t => t.tags.modifier === 'Risky').length;
    if (riskyCount === 0) {
      diagnostics.push({
        code: 'WARN_NO_RISK_TAKING',
        title: 'ZERO RISK',
        description: 'You never took a risk. Tension cannot build without vulnerability.',
        severity: 'high',
      });
    }

    // Never escalated
    const escalateCount = history.filter(t => t.tags.intent === 'Escalate').length;
    const flirtCount = history.filter(t => t.tags.intent === 'Flirt').length;

    if (escalateCount === 0 && flirtCount < 2) {
      diagnostics.push({
        code: 'WARN_FRIEND_ZONE_PATTERN',
        title: 'FRIEND ZONED',
        description: 'You never made a move. She saw you as a friend, not a romantic interest.',
        severity: 'high',
      });
    }

    // Tension never built
    const maxTension = Math.max(...history.map(t => t.stats_after.tension));
    if (maxTension < 40) {
      diagnostics.push({
        code: 'WARN_NO_TENSION_BUILT',
        title: 'NO CHEMISTRY',
        description: `Peak tension was only ${maxTension}. Romance needs spark.`,
        severity: 'high',
        details: 'Try teasing, flirting, or creating playful moments',
      });
    }
  }

  // C-RANK specific (The Fade / Vibe death)
  if (rank === 'C') {
    // Too passive (lots of React intent)
    const reactCount = history.filter(t => t.tags.intent === 'React').length;
    const reactPercent = history.length > 0 ? Math.round((reactCount / history.length) * 100) : 0;

    if (reactPercent > 30) {
      diagnostics.push({
        code: 'WARN_LOW_ENGAGEMENT',
        title: 'LOW ENGAGEMENT',
        description: `${reactPercent}% passive responses. Lead the conversation more.`,
        severity: 'medium',
      });
    }

    // Vibe crashed
    const vibeCrash = history.find(t => t.stat_changes.vibe < -15);
    if (vibeCrash) {
      diagnostics.push({
        code: 'WARN_VIBE_CRASH',
        title: 'VIBE KILLED',
        description: `Something killed the mood at turn ${vibeCrash.turn_number + 1}.`,
        severity: 'medium',
        turnNumber: vibeCrash.turn_number,
      });
    }

    // Had opportunity but missed it
    const goodMoment = history.find(
      t => t.stats_after.trust > 70 && t.stats_after.tension > 50
    );
    if (goodMoment) {
      diagnostics.push({
        code: 'WARN_MISSED_WINDOWS',
        title: 'MISSED WINDOW',
        description: `Had a moment at turn ${goodMoment.turn_number + 1} but didn't capitalize.`,
        severity: 'medium',
        turnNumber: goodMoment.turn_number,
        details: `Trust: ${goodMoment.stats_after.trust}, Tension: ${goodMoment.stats_after.tension}`,
      });
    }
  }

  // B-RANK specific (Got her number but missed the kiss)
  if (rank === 'B') {
    // Was close to S-rank
    const nearMiss = history.find(
      t => t.stats_after.trust >= 65 && t.stats_after.tension >= 75
    );

    if (nearMiss || (finalStats.trust >= 65 && finalStats.tension >= 60)) {
      diagnostics.push({
        code: 'INFO_MISSED_WINDOW',
        title: 'HESITATED',
        description: 'You had the stats for a kiss but never went for it.',
        severity: 'low',
        details: 'Next time, look for the moment and take it',
      });
    }

    // Over-cautious
    const escalateCount = history.filter(t => t.tags.intent === 'Escalate').length;
    if (escalateCount === 0 && finalStats.tension > 60) {
      diagnostics.push({
        code: 'INFO_OVER_CAUTIOUS',
        title: 'OVER-CAUTIOUS',
        description: 'High tension but you never made a move. Fortune favors the bold.',
        severity: 'low',
      });
    }
  }

  return diagnostics;
}

/**
 * Positive Pattern Detection (for S/A ranks)
 */
function detectPositivePatterns(
  history: DetailedTurn[],
  rank: string,
  finalStats: FinalStats
): DiagnosticItem[] {
  const diagnostics: DiagnosticItem[] = [];

  // S-RANK achievements
  if (rank === 'S') {
    diagnostics.push({
      code: 'SUCCESS_PERFECT_CHEMISTRY',
      title: 'PERFECT CHEMISTRY',
      description: 'All conditions met. You read the room perfectly.',
      severity: 'success',
    });
  }

  // A-RANK achievements
  if (rank === 'A') {
    if (finalStats.trust >= 85) {
      diagnostics.push({
        code: 'SUCCESS_GENTLEMAN',
        title: 'THE GENTLEMAN',
        description: 'Built incredible trust. She feels completely safe with you.',
        severity: 'success',
      });
    }
  }

  // General positive patterns for any winning rank
  if (['S', 'A', 'B'].includes(rank)) {
    // High unique modifier usage
    const uniqueCount = history.filter(t => t.tags.modifier === 'Unique').length;
    const uniquePercent = history.length > 0 ? Math.round((uniqueCount / history.length) * 100) : 0;

    if (uniquePercent >= 40) {
      diagnostics.push({
        code: 'SUCCESS_WIT',
        title: 'WITTY',
        description: `${uniquePercent}% unique responses. You were memorable.`,
        severity: 'success',
      });
    }

    // Good tension management
    const maxTension = Math.max(...history.map(t => t.stats_after.tension), 0);
    const hadIck = history.some(t => t.critical_event?.event_type === 'ick_trigger');

    if (maxTension >= 80 && !hadIck) {
      diagnostics.push({
        code: 'SUCCESS_TENSION_MASTER',
        title: 'TENSION MASTER',
        description: 'Built romantic tension to 80+ without triggering the ick.',
        severity: 'success',
      });
    }

    // Good balance of talking about self vs other
    const selfCount = history.filter(t => t.tags.modifier === 'Self-focused').length;
    const otherCount = history.filter(t => t.tags.modifier === 'Other-focused').length;

    if (otherCount > selfCount && otherCount >= 3) {
      diagnostics.push({
        code: 'SUCCESS_GOOD_LISTENER',
        title: 'GOOD LISTENER',
        description: 'Focused more on her than yourself. Attentive.',
        severity: 'success',
      });
    }
  }

  return diagnostics;
}

// ============================================================================
// Main Export
// ============================================================================

const severityOrder: Record<DiagnosticSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  success: 4,
};

/**
 * Analyze game history and return diagnostic findings
 */
export function analyzeDiagnostics(
  history: DetailedTurn[],
  rank: string,
  finalStats: FinalStats
): DiagnosticItem[] {
  const diagnostics: DiagnosticItem[] = [];

  // Run all pattern detectors
  diagnostics.push(...detectSimpPattern(history));
  diagnostics.push(...detectCreepPattern(history));
  diagnostics.push(...detectNPCPattern(history));
  diagnostics.push(...detectRankSpecificPatterns(history, rank, finalStats));
  diagnostics.push(...detectPositivePatterns(history, rank, finalStats));

  // Sort by severity (critical first, success last)
  diagnostics.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Dedupe by code (in case multiple detectors flag same issue)
  const seen = new Set<string>();
  return diagnostics.filter(d => {
    if (seen.has(d.code)) return false;
    seen.add(d.code);
    return true;
  });
}
