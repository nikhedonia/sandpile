import React, { Component } from 'react';

export default ({gameOver, winner, player, final, colors}) => {
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
