// Built-in puzzle levels

export const BUILTIN_LEVELS = [
  {
    name: "Getting Out",
    width: 6,
    height: 6,
    pieces: [
      { id: "target", cells: [[2,2],[3,2]], color: "#ff6b6b", isTarget: true },
      { id: "p1",     cells: [[0,0],[1,0]], color: "#4ecdc4" },
      { id: "p2",     cells: [[0,2],[0,3]], color: "#45b7d1" },
      { id: "p3",     cells: [[4,0],[4,1]], color: "#96ceb4" },
    ],
    goal: { pieceId: "target", cells: [[4,2],[5,2]] }
  },
  {
    name: "Simple Jam",
    width: 6,
    height: 6,
    pieces: [
      { id: "target", cells: [[2,2],[2,3]], color: "#ff6b6b", isTarget: true },
      { id: "p1",     cells: [[2,0],[2,1]], color: "#4ecdc4" },
      { id: "p2",     cells: [[0,2],[1,2]], color: "#45b7d1" },
      { id: "p3",     cells: [[3,2],[4,2]], color: "#96ceb4" },
      { id: "p4",     cells: [[0,4],[0,5]], color: "#ffeaa7" },
      { id: "p5",     cells: [[3,4],[4,4]], color: "#dfe6e9" },
    ],
    goal: { pieceId: "target", cells: [[2,4],[2,5]] }
  },
  {
    name: "L-Block Challenge",
    width: 6,
    height: 6,
    pieces: [
      { id: "target", cells: [[0,2],[1,2]], color: "#ff6b6b", isTarget: true },
      { id: "p1",     cells: [[2,1],[2,2],[2,3]], color: "#4ecdc4" },
      { id: "p2",     cells: [[3,0],[4,0],[4,1]], color: "#a29bfe" },
      { id: "p3",     cells: [[0,4],[1,4],[1,5]], color: "#fd79a8" },
      { id: "p4",     cells: [[3,3],[3,4]], color: "#55efc4" },
      { id: "p5",     cells: [[5,2],[5,3],[5,4]], color: "#ffeaa7" },
    ],
    goal: { pieceId: "target", cells: [[4,2],[5,2]] }
  },
  {
    name: "Traffic",
    width: 6,
    height: 6,
    pieces: [
      { id: "target", cells: [[1,2],[2,2]], color: "#ff6b6b", isTarget: true },
      { id: "p1",     cells: [[0,0],[1,0],[1,1]], color: "#4ecdc4" },
      { id: "p2",     cells: [[3,0],[3,1]], color: "#45b7d1" },
      { id: "p3",     cells: [[4,0],[5,0]], color: "#96ceb4" },
      { id: "p4",     cells: [[0,2],[0,3]], color: "#a29bfe" },
      { id: "p5",     cells: [[3,2],[4,2]], color: "#fd79a8" },
      { id: "p6",     cells: [[5,1],[5,2],[5,3]], color: "#55efc4" },
      { id: "p7",     cells: [[1,3],[2,3],[2,4]], color: "#ffeaa7" },
      { id: "p8",     cells: [[3,4],[4,4],[4,5]], color: "#dfe6e9" },
    ],
    goal: { pieceId: "target", cells: [[4,2],[5,2]] }
  },
  {
    name: "Klotski Escape",
    width: 5,
    height: 5,
    pieces: [
      { id: "target", cells: [[1,0],[2,0],[1,1],[2,1]], color: "#ff6b6b", isTarget: true },
      { id: "p1",     cells: [[0,0],[0,1]], color: "#4ecdc4" },
      { id: "p2",     cells: [[3,0],[3,1]], color: "#45b7d1" },
      { id: "p3",     cells: [[4,0],[4,1]], color: "#96ceb4" },
      { id: "p4",     cells: [[0,2],[0,3]], color: "#a29bfe" },
      { id: "p5",     cells: [[1,2],[2,2]], color: "#fd79a8" },
      { id: "p6",     cells: [[3,2],[4,2]], color: "#55efc4" },
      { id: "p7",     cells: [[1,3],[1,4]], color: "#ffeaa7" },
      { id: "p8",     cells: [[2,3],[3,3]], color: "#dfe6e9" },
      { id: "p9",     cells: [[4,3],[4,4]], color: "#e17055" },
    ],
    goal: { pieceId: "target", cells: [[1,3],[2,3],[1,4],[2,4]] }
  }
];
