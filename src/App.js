import React, { Component } from 'react';
import {diff} from 'deep-object-diff';
import Viva from 'vivagraphjs';
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
  Object.values(board).filter(x=> x[1] == 1).length,
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


const GNode = ({x, y , text, size, color, r, onClick}) => {
  const transform = `translate(${x}, ${y})`;
  return (
    <g transform={transform} width={r*2} height={r*2} onClick={onClick} >
      <circle cx={0} cy={0} r={r} fill={color} stroke="black"/>
      <text 
        textAnchor="middle"
        fontSize={size} 
        x={0} 
        y={0+size/2}>{text}</text>
    </g>
  )
}

const toViva = ({fields, connections}) => {
  const g = Viva.Graph.graph();

  Object.entries(fields).forEach( 
    ([id, [label, c]]) => g.addNode(id, {id, label, color:c})
  );

  Object.entries(connections).map( 
    ([from, links]) => links.map( to => [from, to])
  ).reduce( (a,b) => [...a, ...b], []).forEach( ([from, to]) => {
    g.addLink(from, to)
  });

  return g;
};


class Graph extends Component {

  shouldStep() {
    let c = 0;
    const norm = ({x, y}) => (Math.abs(x) + Math.abs(y))/2;
    this.layout.forEachBody(b => { 
      c = c || (norm(b.force) + norm(b.velocity)) > 0.00001; 
    });

    return 1;//c;
  }


  step() {
    if(this.timer) return;
    this.timer = setInterval(() => {
      this.layout.step();
      this.layout.step();
      this.layout.step();
      this.setState({i:this.state.i+1});
      if(!this.shouldStep()) 
        clearInterval(this.timer);
    }, 8)
  }


  constructor(props) {
    super(props);
    const g = toViva(props.data);
    this.layout = Viva.Graph.Layout.forceDirected(
      g, {
        springLength : 10,
        springCoeff : 0.0005,
        dragCoeff : 0.005,
        gravity : -1.2
      }
    );

    this.state={i:0};
    while(!this.layout.step());
  }

  componentWillUnmount(){ clearInterval(this.timer); }

  shouldComponentUpdate(next, state) {
    if(this.state.i != state.i) return true;

    const oldNodes = new Set(Object.keys(this.props.data.connections)); 
    const newNodes = new Set(Object.keys(next.data.connections))

    let s = 0;
    [...newNodes].filter( x => !oldNodes.has(x)).forEach( x => {
      s = 1;
      this.layout.graph.addNode(x);
    });

    [...oldNodes].filter( x => !newNodes.has(x)).forEach( x => {
      s = 1;
      this.layout.graph.removeNode(x);
    });


    Object.entries(next.data.connections).forEach( ([from, newEdges]) => {
      const oldEdges = new Set(this.props.data.connections[from]||[]);
      const newEdgesSet = new Set(newEdges);

      const toAdd = [...newEdges].filter( x => !oldEdges.has(x) || !oldNodes.has(x));
      const toRemove = [...oldEdges].filter( x => !newEdgesSet.has(x));

      toAdd.forEach(to => this.layout.graph.addLink(from, to));

      toRemove.forEach(to => this.layout.graph.removeLink(
        this.layout.graph.getLink(from, to)
      ));

      s = s || (toAdd||toRemove);
    });


    if(s) {
      this.layout.step();
      this.step();
    }

    return true;
  }

  render() {

    const nodes = Object.entries(this.props.data.fields)
      .map( ([id, [value ,c]]) => ({...this.layout.getNodePosition(id), id, value, color: colors[c]}))
      .map( ({id, x, y, value, color}) => 
      <GNode id={id} text={value} x={x} y={y} size={8} color={color} r={8} key={id} onClick={()=>this.props.onSelect({id, value, x, y, color})} />);

    const edges = [...new Set(
      Object.keys(this.props.data.fields)
      .map(id => this.layout.graph.getNode(id).links.map(l=>l.id))
      .reduce( (a,b) => [...a, ...b], []))]
      .map( (id) => [id, this.layout.getLinkPosition(id)])
      .map( ([id, {from, to}]) => 
      <path stroke={"black"} key={id} d={`M${from.x} ${from.y} L${to.x} ${to.y}`}/>);

    /*
    const {x1,x2,y1,y2} = Object.keys(this.props.data.fields)
      .map(id=>this.layout.getNodePosition(id))
      .reduce( ({x1, y1, x2,y2}, {x,y}) => ({
        x1: Math.min(x1, x),
        x2: Math.max(x1, x),
        y1: Math.min(y1, y),
        y2: Math.max(y2, y)
      }), {x1:Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity});
      */  
    const {x1, x2, y1, y2} = this.layout.getGraphRect();

    return (
      <svg style={this.props.style} viewBox={`${x1-20} ${y1-20} ${x2-x1+40} ${y2-y1+40}`}>
        <g>
          {edges}
          {nodes}
        </g>
      </svg>
    );
  }
}

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
      final: 1,
      bombs: [3,3]
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


  removeNode(id) {

    if (this.state.board.connections[id].some(x => this.state.board.connections[x].length<3))
      return null;

    const fields = Object.entries(this.state.board.fields)
      .filter( ([i]) => id!=i)
      .reduce( (a, [id, data]) => ({...a, [id]:data}), {});

    const connections = Object.entries(this.state.board.connections)
      .filter( ([i]) => i != id)
      .map( ([i, links]) => [i, links.filter( l=> l!=id)])
      .reduce( (a, [id, data]) => ({...a, [id]:data}), {});

    return {fields, connections};
    //this.setState({board:{fields, connections}});
  }


  onSelect(id) {
    if(!id) return;
    const {fields, connections} = this.state.board;
    const {player, final} = this.state;
    if(!final) return;

    const {mode, bombs} = this.state;

    if (mode && !bombs[player]) return;

    if (!mode) {
      const color = fields[id][1];
      if (color && color != player+1) return;
    }

    const next = mode 
      ? this.removeNode(id) 
      : {connections, fields: {
        ...fields,
        [id]: [fields[id][0]+1, 1+player]
      }};

    if (!next) return;

    const [b1, b2] = bombs;
    this.setState({
      player: (player+1)%2,
      bombs: mode ? [b1-(player==0), b2-(player==1)] : [b1, b2],
      mode: 0
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
    const {player, final, mode, bombs} = this.state;

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
            <button onClick={() => this.setState({mode:0})} disabled={!mode} > increment </button>
            <button onClick={() => this.setState({mode:1})} disabled={mode && !bombs[player]} > bomb ({bombs[player]}) </button>
          </div>

          <div>
            <span> scores: </span>
            <span style={{color:colors[1]}}>{score[0]}</span>
            <span> | </span>
            <span style={{color:colors[2]}}>{score[1]}</span>
          </div>

          <Graph
            onSelect = { ({id}) => {
              this.onSelect(id);
            }}
            style = {{display:"flex", borderTop:"solid 1px black", flex:1}}
            data = {this.state.board} 
          />
        </div>
    );
  }
}

export default App;
