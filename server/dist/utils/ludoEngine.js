"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeTokenMove = exports.isValidMove = exports.hasValidMoves = exports.isCellSafe = exports.mapStepToCommonTrack = exports.SAFE_CELLS = exports.START_CELLS = void 0;
// Ludo constant mappings
exports.START_CELLS = {
    red: 0,
    green: 13,
    yellow: 26,
    blue: 39
};
exports.SAFE_CELLS = [0, 8, 13, 21, 26, 34, 39, 47];
/**
 * Maps a player's step position (-1 to 56) to the global common track index (0-51)
 * Returns -1 if token is in yard (-1) or on home stretch/home (>= 51)
 */
const mapStepToCommonTrack = (color, step) => {
    if (step < 0 || step > 50)
        return -1;
    const startCell = exports.START_CELLS[color];
    return (startCell + step) % 52;
};
exports.mapStepToCommonTrack = mapStepToCommonTrack;
/**
 * Checks if a specific common track cell is a safe cell.
 */
const isCellSafe = (cellIndex) => {
    return exports.SAFE_CELLS.includes(cellIndex);
};
exports.isCellSafe = isCellSafe;
/**
 * Checks if a player has any valid moves available for the rolled dice value.
 */
const hasValidMoves = (player, diceValue) => {
    for (const token of player.tokens) {
        // Can release from base on a 6
        if (token.position === -1 && diceValue === 6) {
            return true;
        }
        // Can move along the board if we don't overshoot the home (56)
        if (token.position >= 0 && token.position < 56) {
            if (token.position + diceValue <= 56) {
                return true;
            }
        }
    }
    return false;
};
exports.hasValidMoves = hasValidMoves;
/**
 * Verifies if a specific move action is valid.
 */
const isValidMove = (player, tokenId, diceValue) => {
    const token = player.tokens.find(t => t.id === tokenId);
    if (!token)
        return false;
    // Cannot move finished token
    if (token.position === 56)
        return false;
    // Must roll 6 to get out of base
    if (token.position === -1) {
        return diceValue === 6;
    }
    // Cannot overshoot home
    return token.position + diceValue <= 56;
};
exports.isValidMove = isValidMove;
/**
 * Executes a token move on the game session players array.
 * Modifies the array in-place, processes captures, and determines the next turn.
 */
const executeTokenMove = (players, activePlayerIndex, tokenId, diceValue) => {
    const activePlayer = players[activePlayerIndex];
    const token = activePlayer.tokens.find(t => t.id === tokenId);
    const previousPosition = token.position;
    let newPosition = previousPosition;
    if (previousPosition === -1) {
        newPosition = 0; // Release to starting cell
    }
    else {
        newPosition = previousPosition + diceValue;
    }
    // Update position
    token.position = newPosition;
    // Update token safety
    const globalCell = (0, exports.mapStepToCommonTrack)(activePlayer.color, newPosition);
    token.isSafe = globalCell !== -1 ? (0, exports.isCellSafe)(globalCell) : true;
    let tokenReachedHome = false;
    if (newPosition === 56) {
        tokenReachedHome = true;
    }
    const capturedTokens = [];
    // Check captures if landing on common track
    if (globalCell !== -1 && !(0, exports.isCellSafe)(globalCell)) {
        for (let pIdx = 0; pIdx < players.length; pIdx++) {
            if (pIdx === activePlayerIndex)
                continue; // Skip own tokens
            const otherPlayer = players[pIdx];
            for (const otherToken of otherPlayer.tokens) {
                const otherGlobalCell = (0, exports.mapStepToCommonTrack)(otherPlayer.color, otherToken.position);
                if (otherGlobalCell === globalCell) {
                    // Send back to yard
                    otherToken.position = -1;
                    otherToken.isSafe = true;
                    capturedTokens.push({
                        playerId: otherPlayer.userId.toString(),
                        color: otherPlayer.color,
                        tokenId: otherToken.id
                    });
                }
            }
        }
    }
    // Check if active player has completed the game (all 4 tokens reached 56)
    const isFinished = activePlayer.tokens.every(t => t.position === 56);
    // Turn management rules:
    // Rolling 6, capturing a token, or reaching home grants an extra roll to the current player.
    const getsExtraRoll = (diceValue === 6 || capturedTokens.length > 0 || tokenReachedHome) && !isFinished;
    let nextPlayerIndex = activePlayerIndex;
    if (!getsExtraRoll) {
        // Find next active player who hasn't finished the game
        do {
            nextPlayerIndex = (nextPlayerIndex + 1) % players.length;
        } while (players[nextPlayerIndex].tokens.every(t => t.position === 56) &&
            nextPlayerIndex !== activePlayerIndex);
    }
    // Check if game is completed (only one player remains or a player reaches the win condition)
    // For standard 2 player game, if 1 player has finished all tokens, they are the winner.
    const activePlayersLeftCount = players.filter(p => !p.tokens.every(t => t.position === 56)).length;
    const gameCompleted = isFinished || activePlayersLeftCount <= 1;
    return {
        success: true,
        capturedTokens,
        tokenReachedHome,
        nextPlayerId: players[nextPlayerIndex].userId.toString(),
        gameCompleted
    };
};
exports.executeTokenMove = executeTokenMove;
