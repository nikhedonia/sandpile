export function* propagate({fields, connections}) {
  let prev = fields;
  while (1) {
    const colors = new Set(Object
      .values(prev)
      .filter( ([_, c]) => c));

    const diff = Object.entries(prev).filter( 
      ([k, [value, color]]) => 
      value >= connections[k].length
    ).map( ([k, [value, color]]) => [
      [k, [-connections[k].length, color]],
      ...connections[k]
      .map(f => [f, fields[f]])
      .map( ([k, [v]]) => [k, [+1, color]]) 
    ]).reduce( (a,b) => [...a, ...b], []);


    const gameOver = (colors.size==1 && !colors.has(0));
    const final = (!diff.length) || gameOver;

    const next = diff.reduce( (a, [k, [v, c]]) => ({
      ...a,
      [k]: [a[k][0] + v, c]
    }), {...prev});

    yield {fields: next, connections, final};

    prev = next;

    if (final) break;
  }
}

export const getScore = (board) => [
  Object.values(board).filter(x=> x[1] == 1).length,
  Object.values(board).filter(x=> x[1] == 2).length,
];

export const removeNode = (board, id, min=3) => {
  if (board.connections[id].some(x => board.connections[x].length < min))
    return null;

  const fields = Object.entries(board.fields)
    .filter( ([i]) => id!=i)
    .reduce( (a, [id, data]) => ({...a, [id]:data}), {});

  const connections = Object.entries(board.connections)
    .filter( ([i]) => i != id)
    .map( ([i, links]) => [i, links.filter( l=> l!=id)])
    .reduce( (a, [id, data]) => ({...a, [id]:data}), {});

  return {fields, connections};
}

export const gameState = ({fields}) => {
  const [a, b] = getScore(fields);
  const max = Object.values(fields).length;

  return {
    gameOver: a==max || b==max,
    winner: a-b
  };
};
