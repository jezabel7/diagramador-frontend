import { useEffect, useRef } from "react";
import * as joint from "@joint/core";
import "./index.css";

function App() {
  const graphRef = useRef(null);

  useEffect(() => {
    const graph = new joint.dia.Graph();

    const paper = new joint.dia.Paper({
      el: graphRef.current,
      model: graph,
      width: 800,
      height: 600,
      gridSize: 10,
      drawGrid: true,
    });

    const rect = new joint.shapes.standard.Rectangle();
    rect.position(100, 100);
    rect.resize(120, 40);
    rect.attr({ body: { fill: "#4e73df", rx: 10, ry: 10 }, label: { text: "Paciente", fill: "white" } });
    rect.addTo(graph);

    const rect2 = new joint.shapes.standard.Rectangle();
    rect2.position(400, 200);
    rect2.resize(120, 40);
    rect2.attr({ body: { fill: "#1cc88a", rx: 10, ry: 10 }, label: { text: "Medico", fill: "white" } });
    rect2.addTo(graph);

    const link = new joint.shapes.standard.Link();
    link.source(rect);
    link.target(rect2);
    link.attr({ line: { stroke: "black", strokeWidth: 2, targetMarker: { type: "classic", fill: "black" } } });
    link.addTo(graph);
  }, []);

  return (
    <div>
      <h1>Diagramador básico</h1>
      <div ref={graphRef} style={{ border: "1px solid gray", marginTop: 10 }} />
    </div>
  );
}

export default App;
