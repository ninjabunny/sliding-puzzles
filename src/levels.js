// Built-in puzzle levels

const BUILTIN_LEVELS = [
  {
    name: "Simplicity 2",
    width: 4,
    height: 5,
    pieces: [
      {
        id: "p3",
        cells: [[0, 4]],
        color: "#000000",
        isStatic: true,
      },
      {
        id: "p4",
        cells: [[1, 4]],
        color: "#000000",
        isStatic: true,
      },
      {
        id: "p5",
        cells: [[3, 4]],
        color: "#000000",
        isStatic: true,
      },
      {
        id: "p6",
        cells: [
          [2, 0],
          [2, 1],
          [3, 1],
        ],
        color: "#ff6b6b",
        isTarget: true,
      },
      {
        id: "p8",
        cells: [
          [2, 2],
          [2, 3],
          [3, 3],
        ],
        color: "#45b7d1",
        isTarget: true,
      },
      {
        id: "p9",
        cells: [
          [1, 1],
          [0, 1],
        ],
        color: "#a29bfe",
      },
      {
        id: "p10",
        cells: [
          [1, 2],
          [1, 3],
        ],
        color: "#fd79a8",
      },
    ],
    goals: [
      {
        pieceId: "p6",
        cells: [
          [2, 2],
          [2, 3],
          [3, 3],
        ],
      },
      {
        pieceId: "p8",
        cells: [
          [2, 0],
          [2, 1],
          [3, 1],
        ],
      },
    ],
  },
];
