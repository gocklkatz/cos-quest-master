import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
  effect,
  inject,
} from '@angular/core';
import * as d3 from 'd3';
import { GlobalService } from '../../services/global.service';
import { GlobalEntry, GlobalNode } from '../../models/iris.models';

interface TreeNode {
  label: string;
  value?: string;
  truncated?: boolean;
  children?: TreeNode[];
}

@Component({
  selector: 'app-tree-visualizer',
  standalone: true,
  imports: [],
  templateUrl: './tree-visualizer.component.html',
  styleUrl: './tree-visualizer.component.scss',
})
export class TreeVisualizerComponent implements AfterViewInit {
  private globalService = inject(GlobalService);

  @ViewChild('svgEl') private svgEl!: ElementRef<SVGSVGElement>;

  private viewReady = false;

  constructor() {
    effect(() => {
      const globals = this.globalService.globals();
      if (this.viewReady) {
        this.render(globals);
      }
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.render(this.globalService.globals());
  }

  private render(globals: GlobalEntry[]): void {
    const svgEl = this.svgEl.nativeElement;
    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    if (globals.length === 0) {
      svg
        .append('text')
        .attr('x', '50%')
        .attr('y', '50%')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('class', 'empty-label')
        .text('Run code that sets globals — they will appear here.');
      return;
    }

    const root = d3.hierarchy<TreeNode>(this.toTreeData(globals));

    // nodeSize gives fixed spacing regardless of tree width
    const nodeH = 44;
    const nodeW = 220;
    const treeLayout = d3.tree<TreeNode>().nodeSize([nodeH, nodeW]);
    const treeRoot = treeLayout(root);

    // Measure extents to set viewBox dynamically
    let minX = Infinity, maxX = -Infinity;
    treeRoot.each(n => {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
    });
    const treeHeight = maxX - minX;
    const treeDepth = treeRoot.height * nodeW;
    const padX = 20;
    const padY = 60;
    const vbW = treeDepth + nodeW + padX * 2;
    const vbH = treeHeight + padY * 2;

    svg.attr('viewBox', `0 0 ${vbW} ${vbH}`).attr('preserveAspectRatio', 'xMidYMid meet');

    // Zoom/pan layer
    const g = svg.append('g');
    svg.call(
      d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.25, 4])
        .on('zoom', event => g.attr('transform', event.transform)),
    );

    // Initial translate: root at left-centre
    const initTx = padX;
    const initTy = -minX + padY;
    g.attr('transform', `translate(${initTx},${initTy})`);

    // Links
    g.selectAll<SVGPathElement, d3.HierarchyLink<TreeNode>>('.link')
      .data(treeRoot.links())
      .join('path')
      .attr('class', 'link')
      .attr(
        'd',
        d3
          .linkHorizontal<d3.HierarchyLink<TreeNode>, d3.HierarchyPointNode<TreeNode>>()
          .x(d => d.y)
          .y(d => d.x),
      );

    // Node groups
    const node = g
      .selectAll<SVGGElement, d3.HierarchyPointNode<TreeNode>>('.node')
      .data(treeRoot.descendants())
      .join('g')
      .attr('class', d => (d.data.truncated ? 'node truncated' : 'node'))
      .attr('transform', d => `translate(${d.y},${d.x})`);

    node.append('circle').attr('r', d => (d.depth === 0 ? 7 : 5));

    // Primary label (key / name)
    node
      .append('text')
      .attr('class', 'node-label')
      .attr('dy', d => (d.data.value ? '-0.3em' : '0.35em'))
      .attr('x', d => (d.children ? -12 : 12))
      .attr('text-anchor', d => (d.children ? 'end' : 'start'))
      .text(d => d.data.label);

    // Value label (shown below the key for leaf nodes that have a value)
    node
      .filter(d => !!d.data.value)
      .append('text')
      .attr('class', 'value-label')
      .attr('dy', '1em')
      .attr('x', d => (d.children ? -12 : 12))
      .attr('text-anchor', d => (d.children ? 'end' : 'start'))
      .text(d => `= ${d.data.value}`);
  }

  private toTreeData(globals: GlobalEntry[]): TreeNode {
    return {
      label: 'USER',
      children: globals.map(g => ({
        label: g.name,
        children: g.children.length ? g.children.map(n => this.mapNode(n)) : undefined,
      })),
    };
  }

  private mapNode(n: GlobalNode): TreeNode {
    return {
      label: n.truncated ? '…' : n.key,
      value: n.value,
      truncated: n.truncated,
      children: n.children.length ? n.children.map(c => this.mapNode(c)) : undefined,
    };
  }
}
