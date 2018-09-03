
import React, { Component } from 'react';
import Viva from 'vivagraphjs';
import Node from './node';

const boardToGraph = (board, colors) => ({
  nodes: Object
  .entries(board.fields)
  .map( ([id, [label, c]]) => ({id, label:label.toString(), color: colors[c]})),
  edges: Object
  .entries(board.connections)
  .map( ([from, tos]) => tos.map(to => ({from, to})))
  .reduce( (a, b) => a.concat(b), [])
});

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

export default class Graph extends Component {

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
      .map( ([id, [value ,c]]) => ({...this.layout.getNodePosition(id), id, value, color: this.props.colors[c]}))
      .map( ({id, x, y, value, color}) => 
        <Node id={id} text={value} x={x} y={y} size={8} color={color} r={8} key={id} onClick={()=>this.props.onSelect({id, value, x, y, color})} />);

    const edges = [...new Set(
      Object.keys(this.props.data.fields)
        .map(id => this.layout.graph.getNode(id).links.map(l=>l.id))
        .reduce( (a,b) => [...a, ...b], []))]
        .map( (id) => [id, this.layout.getLinkPosition(id)])
        .map( ([id, {from, to}]) => 
          <path stroke={"black"} key={id} d={`M${from.x} ${from.y} L${to.x} ${to.y}`}/>);

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
