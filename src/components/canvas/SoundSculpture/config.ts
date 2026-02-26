export interface PieceConfig {
    id: number;
    targetPos: [number, number, number];
    initialPos: [number, number, number];
}

export const generateSculpturePieces = (count: number): PieceConfig[] => {
    const pieces: PieceConfig[] = [];
    const radius = 2.5;
    const goldenRatio = (1 + Math.sqrt(5)) / 2;

    for (let i = 0; i < count; i++) {
        // Fibonacci sphere placement for the target shape
        const theta = 2 * Math.PI * i / goldenRatio;
        const phi = Math.acos(1 - 2 * (i + 0.5) / count);

        const tx = radius * Math.cos(theta) * Math.sin(phi);
        const ty = radius * Math.sin(theta) * Math.sin(phi) + 5;
        const tz = radius * Math.cos(phi);

        // Dispersed starting position
        const ix = (Math.random() - 0.5) * 20;
        const iy = Math.random() * 15 + 2;
        const iz = (Math.random() - 0.5) * 20;

        pieces.push({
            id: i + 1,
            targetPos: [tx, ty, tz],
            initialPos: [ix, iy, iz],
        });
    }
    return pieces;
};

export const TOTAL_PIECES = 45;
export const sculpturePieces = generateSculpturePieces(TOTAL_PIECES);
