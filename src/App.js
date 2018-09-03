import React, { Component } from 'react';
import {diff} from 'deep-object-diff';
import logo from './logo.svg';
import './App.css';
import {createLattice} from './generators';
import {propagate, gameState, getScore, removeNode} from './sandpiles';
import Statusbar from './components/statusbar';
import Graph from './components/graph';


const colors = [
  "#fff",
  "#f00",
  "#0f0"
];

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
      ? removeNode({fields, connections}, id, 3) 
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
    const status = {gameOver, winner, player, final};

    return (
      <div className="App" 
        style={{
          size:"3em", 
          display: "flex",
          flexDirection: "column"
        }}>
          {this.settings()}
          <Statusbar {...status} colors={colors}/>
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
            colors={colors}
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
