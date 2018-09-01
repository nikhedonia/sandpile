import React, { Component } from 'react';
import Graph from 'react-graph-vis';
import logo from './logo.svg';
import './App.css';


function createLattice(n, m) {
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



function* propagate({fields, connections}) {
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


const colors = [
  "#fff",
  "#f00",
  "#0f0"
];

const boardToGraph = (board) => ({
  nodes: Object
    .entries(board.fields)
    .map( ([id, [label, c]]) => ({id, label:label.toString(), color: colors[c]})),
  edges: Object
    .entries(board.connections)
    .map( ([from, tos]) => tos.map(to => ({from, to})))
    .reduce( (a, b) => a.concat(b), [])
});

const getScore = (board) => [
  Object.values(board).filter(x=> console.log(x) || x[1] == 1).length,
  Object.values(board).filter(x=> x[1] == 2).length,
];

const gameState = ({fields}) => {
  const [a, b] = getScore(fields);
  const max = Object.values(fields).length;

  return {
    gameOver: a==max || b==max,
    winner: a-b
  };
};

const statusBar = ({gameOver, winner, player, final}) => {
    if (gameOver) {
      const text = winner>0 
        ? "Player 1 won" 
        : "Player 2 won";
      return <div> {text} </div>
    }

    if (!final) {
      return <div> Computing... </div>
    }
  
    return (
      <div style={{color:colors[player+1]}}>
        Player {player+1}
      </div>
    )
  }


//console.log(graph)

class App extends Component {

  constructor() {
    super();
    this.inputs = [
      React.createRef(), 
      React.createRef()
    ];
    this.state = {
      board: createLattice(3,3),
      player: 0,
      final: 1
    };
  }

  restart() {
    this.setState({
      board: createLattice(
        this.inputs[0].current.value, 
        this.inputs[1].current.value),
      player: 0,
      final: 1
    })
  }

  onSelect({nodes: [id]}) {
    if(!id) return;
    const {fields, connections} = this.state.board;
    const {player, final} = this.state;
    if(!final) return;
    const color = fields[id][1];
    if (color && color != player+1) return;

    const [v, c] = fields[id];
    const next = {connections, fields: {
      ...fields,
      [id]: [v+1, 1+player]
    }};

    this.setState({
      //board: next, 
      player: (player+1)%2,
      //final: 
    });

    let i = 0;
    for(const board of propagate(next)) {
      const score = getScore(board.fields);
      setTimeout(() => this.setState({board, final:board.final}), 300 * i++) 
      if (score.some(x=>x>=Object.values(board.fields).length)) {
        break;
      }
    }
  }

  settings() {
    return (
        <div>
          <h2> Settings </h2>
          <input name="n" type="number" defaultValue={3} min={3} max={10} ref={this.inputs[0]} />
          <input name="m" type="number" defaultValue={3} min={3} max={10} ref={this.inputs[1]} />
          <button onClick={()=>this.restart()}> Restart </button>
        </div>
    );
  }


  render() {
    const score = getScore(this.state.board.fields);
    const {gameOver, winner} = gameState(this.state.board);
    const {player, final} = this.state;

    return (
      <div className="App" 
        style={{
          size:"3em", 
          display: "flex",
          flexDirection: "column"
          
        }}>
        {this.settings()}
        {statusBar({gameOver, winner, player, final})}
        <div>
          <span> scores: </span>
          <span style={{color:colors[1]}}>{score[0]}</span>
          <span> | </span>
          <span style={{color:colors[2]}}>{score[1]}</span>
        </div>

        <Graph
          style = {{borderTop:"solid 1px black", flex:1}}
          layout = {{improvedLayout:true}}
          graph = {boardToGraph(this.state.board)} 
          events = {{select: id => this.onSelect(id) }}  
        />
      </div>
    );
  }
}

export default App;
