import React, { Component } from 'react';
export default ({x, y , text, size, color, r, onClick}) => {
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
