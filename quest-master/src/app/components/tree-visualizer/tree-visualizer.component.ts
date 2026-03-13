import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
  computed,
  effect,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as d3 from 'd3';
import { GlobalService } from '../../services/global.service';
import { GlobalEntry, GlobalNode } from '../../models/iris.models'; // GlobalNode used in mapNodeBudgeted
import { globalMatchesFilter } from '../../utils/global-filter';

interface TreeNode {
  label: string;
  value?: string;
  truncated?: boolean;
  children?: TreeNode[];
}

@Component({
  selector: 'app-tree-visualizer',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './tree-visualizer.component.html',
  styleUrl: './tree-visualizer.component.scss',
})
export class TreeVisualizerComponent implements AfterViewInit {
  protected globalService = inject(GlobalService);

  readonly filteredGlobals = computed(() => {
    const term = this.globalService.filterTerm().toLowerCase();
    const all = this.globalService.globals();
    return term ? all.filter(g => globalMatchesFilter(g, term)) : all;
  });

  @ViewChild('svgEl') private svgEl!: ElementRef<SVGSVGElement>;

  private viewReady = false;

  constructor() {
    effect(() => {
      const globals = this.filteredGlobals();
      void this.globalService.loading(); // re-render when loading state changes
      if (this.viewReady) {
        this.render(globals);
      }
    });
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    queueMicrotask(() => this.globalService.refresh());
  }

  clearFilter(): void {
    this.globalService.filterTerm.set('');
  }

  private render(globals: GlobalEntry[]): void {
    const svgEl = this.svgEl.nativeElement;
    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    if (globals.length === 0) {
      const term = this.globalService.filterTerm();
      let msg: string;
      if (this.globalService.loading()) {
        msg = 'Loading globals…';
      } else if (term) {
        msg = `No globals matching '${term}'`;
      } else {
        msg = 'Run code that sets globals — they will appear here.';
      }
      svg
        .append('text')
        .attr('x', '50%')
        .attr('y', '50%')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('class', 'empty-label')
        .attr('fill', '#a89bc4')
        .text(msg);
      return;
    }

    const nodeBudget = this.globalService.filterTerm() ? 2000 : 300;
    const root = d3.hierarchy<TreeNode>(this.toTreeData(globals, nodeBudget));

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
        .scaleExtent([0.25, 10])
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

  private toTreeData(globals: GlobalEntry[], budget: number): TreeNode {
    let remaining = budget;
    const mapNodeBudgeted = (n: GlobalNode): TreeNode | null => {
      if (remaining <= 0) return null;
      remaining--;
      const children = n.children
        .map(c => mapNodeBudgeted(c))
        .filter((c): c is TreeNode => c !== null);
      return {
        label: n.truncated ? '…' : n.key,
        value: n.value,
        truncated: n.truncated,
        children: children.length ? children : undefined,
      };
    };

    return {
      label: 'USER',
      children: globals.map(g => {
        if (remaining <= 0) return { label: g.name };
        remaining--;
        const children = g.children
          .filter(n => !n.key.startsWith('%'))
          .map(n => mapNodeBudgeted(n))
          .filter((c): c is TreeNode => c !== null);
        return {
          label: g.name,
          value: g.value != null ? String(g.value) : undefined,
          children: children.length ? children : undefined,
        };
      }),
    };
  }

}
