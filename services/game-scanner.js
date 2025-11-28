import { listGames as listSteamGames } from './steam-scanner.js'
import { listGames as listEpicGames } from './epic-scanner.js'
import { listGames as listGogGames } from './gog-scanner.js'

export async function listGames() {
  const games = []

  try {
    const [steamGames, epicGames, gogGames] = await Promise.allSettled([
      listSteamGames(),
      listEpicGames(),
      listGogGames(),
    ])

    if (steamGames.status === 'fulfilled') {
      games.push(...steamGames.value)
    } else {
      console.error('Steam scan failed:', steamGames.reason)
    }

    if (epicGames.status === 'fulfilled') {
      games.push(...epicGames.value)
    } else {
      console.error('Epic scan failed:', epicGames.reason)
    }

    if (gogGames.status === 'fulfilled') {
      games.push(...gogGames.value)
    } else {
      console.error('GOG scan failed:', gogGames.reason)
    }
  } catch (error) {
    console.error('Error during game scan:', error)
  }

  return games
}
