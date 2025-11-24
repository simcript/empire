import assert from 'node:assert/strict';
import { listGames } from '../services/game-scanner.js';

async function run() {
  const games = await listGames();
  assert.ok(Array.isArray(games), 'listGames() must return an array');

  games.forEach((game) => {
    assert.ok(game.id, 'Missing game id');
    assert.ok(game.title, `Missing title for ${game.id}`);
    assert.ok(game.platform, `Missing platform for ${game.id}`);
  });

  console.log(`Scanner smoke test passed (${games.length} games detected).`);
}

run().catch((error) => {
  console.error('Scanner smoke test failed:', error);
  process.exit(1);
});

