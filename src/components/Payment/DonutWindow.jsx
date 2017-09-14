import React from 'react'
import * as d3 from 'd3'
import Donut from './Donut.jsx'
import DonutLegend from './DonutLegend.jsx'

class DonutWindow extends React.Component {

  render() {
    let width = 400
    let height = 400
    let minViewportSize = Math.min(width, height);
    // This sets the radius of the pie chart to fit within
    // the current window size, with some additional padding
    let radius = (minViewportSize * .9) / 2;
    // Centers the pie chart
    let x = width / 2;
    let y = height / 2;
    let colorScale =  ["rgba(52, 73, 94, 1)", "rgba(37, 116, 169, 1)", "rgba(92, 151, 191, 1)", "rgba(137, 196, 244, 1)", "rgba(82, 179, 217, 1)", "rgba(129, 207, 224, 1)", "rgba(197, 239, 247, 1)"]

    return (
      <div className="donutContainer">
        <svg className="donut" width={width} height={height}>
          <Donut x={x} y={y} radius={radius} data={this.props.data} colorScale={colorScale} />
        </svg>
        <DonutLegend data={this.props.data} colorScale={colorScale} />
      </div>
    );
  }
}

export default DonutWindow