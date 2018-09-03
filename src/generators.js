export function createLattice(n, m) {
  const cols = Array.from({length:n}, (_,i) => i);
  const rows = Array.from({length:m}, (_,i) => i);
  const fields = cols.map(c => rows.map(r=> [c,r])).reduce(
    (a,b) => a.concat(b), [] 
  );

  return {
    fields: fields.map( ([x, y]) => ({
      [`${x}|${y}`]: [0, 0]
    })).reduce( (a,b) => ({...a, ...b}), {}),

    connections: fields.map( ([x,y]) => ({
      [`${x}|${y}`]: [
        [x, y-1],
        [x, y+1],
        [x-1, y],
        [x+1, y]
      ].filter( ([x, y]) => x>=0 && y>=0 && x<n && y<m )
      .map( ([x,y]) => `${x}|${y}`)
    })).reduce( (a,b) => ({...a, ...b}), {})  
  };
}
