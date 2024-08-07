'use es6';

import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

// Specify the number format for values.
const format = d3.format(',d');

// Copyright 2021-2023 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/pack
function Pack(
  data,
  {
    // data is either tabular (array of objects) or hierarchy (nested objects)
    path, // as an alternative to id and parentId, returns an array identifier, imputing internal nodes
    id = Array.isArray(data) ? (d) => d.id : null, // if tabular data, given a d in data, returns a unique identifier (string)
    parentId = Array.isArray(data) ? (d) => d.parentId : null, // if tabular data, given a node d, returns its parent’s identifier
    children, // if hierarchical data, given a d in data, returns its children
    value, // given a node d, returns a quantitative value (for area encoding; null for count)
    sort = (a, b) => d3.descending(a.value, b.value), // how to sort nodes prior to layout
    label, // given a leaf node d, returns the display name
    title, // given a node d, returns its hover text
    link, // given a node d, its link (if any)
    linkTarget = '_blank', // the target attribute for links, if any
    width = 640, // outer width, in pixels
    height = 400, // outer height, in pixels
    margin = 1, // shorthand for margins
    marginTop = margin, // top margin, in pixels
    marginRight = margin, // right margin, in pixels
    marginBottom = margin, // bottom margin, in pixels
    marginLeft = margin, // left margin, in pixels
    padding = 3, // separation between circles
    fill = '#ddd', // fill for leaf circles
    fillOpacity, // fill opacity for leaf circles
    stroke = '#bbb', // stroke for internal circles
    strokeWidth, // stroke width for internal circles
    strokeOpacity, // stroke opacity for internal circles,
    useInterpolatedColorScheme = false,
  } = {}
) {
  // If id and parentId options are specified, or the path option, use d3.stratify
  // to convert tabular data to a hierarchy; otherwise we assume that the data is
  // specified as an object {children} with nested objects (a.k.a. the “flare.json”
  // format), and use d3.hierarchy.
  const root =
    path != null
      ? d3.stratify().path(path)(data)
      : id != null || parentId != null
      ? d3.stratify().id(id).parentId(parentId)(data)
      : d3.hierarchy(data, children);

  // Compute the values of internal nodes by aggregating from the leaves.
  value == null ? root.count() : root.sum((d) => Math.max(0, value(d)));

  // Compute labels and titles.
  const descendants = root.descendants();
  const leaves = descendants.filter((d) => !d.children);
  leaves.forEach((d, i) => (d.index = i));
  const L = label == null ? null : leaves.map((d) => label(d.data, d));
  const T = title == null ? null : descendants.map((d) => title(d.data, d));

  // Sort the leaves (typically by descending value for a pleasing layout).
  if (sort != null) root.sort(sort);

  // Compute the layout.
  d3
    .pack()
    .size([width - marginLeft - marginRight, height - marginTop - marginBottom])
    .padding(padding)(root);

  const svg = d3
    .create('svg')
    .attr('viewBox', [-marginLeft, -marginTop, width, height])
    .attr('width', width)
    .attr('height', height)
    .attr('style', 'max-width: 100%; height: auto; height: intrinsic; ')
    .attr('font-family', 'Cream')
    .attr('font-size', '1em')
    .attr('text-anchor', 'middle');

  const node = svg
    .selectAll('a')
    .data(descendants)
    .join('a')
    .attr('xlink:href', link == null ? null : (d, i) => link(d.data, d))
    .attr('target', link == null ? null : linkTarget)
    .attr('transform', (d) => `translate(${d.x},${d.y})`);

  // Create a categorical color scale.
  const color = d3.interpolateRgb('#515151', '#ffffff');

  // Hard coded and not scalable
  const max = Math.max(...data.children.map((entry) => entry.value));

  node
    .append('circle')
    .attr('fill', (d) =>
      d.children
        ? '#fff'
        : useInterpolatedColorScheme
        ? color(d.data.value / max)
        : fill
    )
    .attr('fill-opacity', (d) => (d.children ? 0 : fillOpacity))
    .attr('stroke', (d) => (d.children ? stroke : null))
    .attr('stroke-width', (d) => (d.children ? strokeWidth : null))
    .attr('stroke-opacity', (d) => (d.children ? strokeOpacity : null))
    .attr('r', (d) => d.r);

  if (T) node.append('title').text((d, i) => T[i]);

  if (L) {
    // A unique identifier for clip paths (to avoid conflicts).
    // debugger;
    const uid = `O-${Math.random().toString(16).slice(2)}`;

    const leaf = node.filter(
      (d) => !d.children && d.r > 10 && L[d.index] != null
    );

    leaf
      .append('clipPath')
      .attr('id', (d) => `${uid}-clip-${d.index}`)
      .append('circle')
      .attr('r', (d) => d.r);

    leaf
      .append('text')
      .attr(
        'clip-path',
        (d) => `url(${new URL(`#${uid}-clip-${d.index}`, location)} )`
      )
      .selectAll('tspan')
      .data((d) => `${L[d.index]}`.split(/\n/g))
      .join('tspan')
      .attr('x', 0)
      .attr('y', (d, i, D) => `${i - D.length / 2 + 0.85}em`)
      .attr('fill-opacity', (d, i, D) => (i === D.length - 1 ? 0.7 : null))
      .text((d) => d);
  }

  return svg.node();
}

const data = [
  { name: 'Ty', value: 156 },
  { name: 'Rechner', value: 80 },
  { name: 'Hextra', value: 54 },
  { name: 'Tobe', value: 42 },
  { name: 'Spicy\nFluffy', value: 38 },
  { name: 'Barkley', value: 34 },
  { name: 'Cobalt', value: 32 },
  { name: 'Xeno', value: 30 },
  { name: 'Tom', value: 28 },
  { name: 'Judas\nHyena', value: 28 },
  { name: 'Zig\nZag', value: 22 },
  { name: 'Spots', value: 20 },
  { name: 'Cake', value: 14 },
  { name: 'Pulse', value: 8 },
];

const sqWidth = 400;

const loadCircles = Pack(
  { name: 'Donors', children: data },
  {
    value: (d, n) => d.value,
    label: (d, n) => `${d.name}\n${d.value}ml`,
    title: (d, n) => d.name,
    padding: 5,
    stroke: '#fff',
    strokeWidth: 3,
    useInterpolatedColorScheme: true,
    margin: 10,
    height: sqWidth,
    width: sqWidth,
  }
);

container.append(loadCircles);
