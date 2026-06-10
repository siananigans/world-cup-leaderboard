// ---------------------------------------------------------------------------
// Scoring rules — edit these numbers to change how the leaderboard is decided.
//
// Match outcomes, stage bonuses and red cards are computed per team from
// matches.json. The snack bonus is per player and comes from players.json.
// Stage bonuses are CUMULATIVE: a team that reaches the semis banks the group,
// quarter and semi bonuses.
// ---------------------------------------------------------------------------
export const SCORING = {
  win: 3,               // your country wins a match
  draw: 1,              // your country draws
  advanceFromGroup: 5,  // reaches the knockout stage (Round of 16)
  quarterFinal: 10,     // reaches the quarter-finals
  semiFinal: 10,        // reaches the semi-finals
  champion: 15,         // World Cup winners 🎉
  redCard: -2,          // per red card shown to the country
  snackDay: 7,          // per day a player brings in snacks 🍪
}

// Stages from earliest to latest, used to work out how far a team got.
export const STAGE_ORDER = ['group', 'round16', 'quarter', 'semi', 'final']

export const STAGE_LABELS = {
  group: 'Group stage',
  round16: 'Round of 16',
  quarter: 'Quarter-final',
  semi: 'Semi-final',
  final: 'Final',
}

const idx = (stage) => STAGE_ORDER.indexOf(stage)

// Compute a points breakdown for a single team from the full match list.
export function scoreTeam(teamCode, matches) {
  let played = 0
  let wins = 0
  let draws = 0
  let losses = 0
  let goalsFor = 0
  let goalsAgainst = 0
  let redCards = 0
  let furthestStageIndex = -1
  let isChampion = false

  for (const m of matches) {
    const isHome = m.home === teamCode
    const isAway = m.away === teamCode
    if (!isHome && !isAway) continue

    const gf = isHome ? m.homeGoals : m.awayGoals
    const ga = isHome ? m.awayGoals : m.homeGoals
    const reds = (isHome ? m.homeReds : m.awayReds) ?? 0

    played += 1
    goalsFor += gf
    goalsAgainst += ga
    redCards += reds

    if (gf > ga) wins += 1
    else if (gf === ga) draws += 1
    else losses += 1

    if (idx(m.stage) > furthestStageIndex) furthestStageIndex = idx(m.stage)
    if (m.stage === 'final' && gf > ga) isChampion = true
  }

  const reached = (stage) => furthestStageIndex >= idx(stage)
  const furthestStage =
    furthestStageIndex >= 0 ? STAGE_ORDER[furthestStageIndex] : null

  const breakdown = {
    fromWins: wins * SCORING.win,
    fromDraws: draws * SCORING.draw,
    fromAdvance: reached('round16') ? SCORING.advanceFromGroup : 0,
    fromQuarter: reached('quarter') ? SCORING.quarterFinal : 0,
    fromSemi: reached('semi') ? SCORING.semiFinal : 0,
    fromChampion: isChampion ? SCORING.champion : 0,
    fromRedCards: redCards * SCORING.redCard,
  }

  const points = Object.values(breakdown).reduce((a, b) => a + b, 0)

  return {
    code: teamCode,
    played,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    redCards,
    furthestStage,
    isChampion,
    breakdown,
    points,
  }
}

// Build the full leaderboard: one row per player, sorted by total points.
export function buildLeaderboard(players, teams, matches) {
  const teamByCode = Object.fromEntries(teams.map((t) => [t.code, t]))

  const rows = players.map((player) => {
    const teamScores = player.teams.map((code) => ({
      ...scoreTeam(code, matches),
      team: teamByCode[code] ?? { code, name: code, flag: '⚽' },
    }))
    const teamPoints = teamScores.reduce((sum, t) => sum + t.points, 0)
    const snackDays = player.snackDays ?? 0
    const snackBonus = snackDays * SCORING.snackDay
    return {
      ...player,
      teamScores,
      snackDays,
      snackBonus,
      points: teamPoints + snackBonus,
    }
  })

  // Sort by points (desc); tie-break on total goals scored across both teams.
  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    const goalsA = a.teamScores.reduce((s, t) => s + t.goalsFor, 0)
    const goalsB = b.teamScores.reduce((s, t) => s + t.goalsFor, 0)
    return goalsB - goalsA
  })

  // Assign ranks, sharing a rank on ties.
  let lastPoints = null
  let lastRank = 0
  rows.forEach((row, i) => {
    if (row.points !== lastPoints) {
      lastRank = i + 1
      lastPoints = row.points
    }
    row.rank = lastRank
  })

  return rows
}
