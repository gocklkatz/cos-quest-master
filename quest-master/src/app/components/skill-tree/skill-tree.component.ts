import { Component, computed, input, output, signal } from '@angular/core';
import { Quest } from '../../models/quest.models';
import { SKILL_BRANCHES, SkillBranch } from '../../data/skill-tree';

export type BranchStatus = 'locked' | 'available' | 'in-progress' | 'completed';

export interface BranchViewModel extends SkillBranch {
  status: BranchStatus;
  questCount: number;
  completedCount: number;
}

@Component({
  selector: 'app-skill-tree',
  standalone: true,
  templateUrl: './skill-tree.component.html',
  styleUrl: './skill-tree.component.scss',
})
export class SkillTreeComponent {
  allQuests = input<Quest[]>([]);
  completedQuestIds = input<string[]>([]);
  selectedBranchId = input<string | null>(null);

  branchSelected = output<string | null>();

  /** Whether the skill tree panel is expanded. */
  expanded = signal(true);

  readonly branches = computed<BranchViewModel[]>(() => {
    const completed = new Set(this.completedQuestIds());
    const quests = this.allQuests();

    return SKILL_BRANCHES.map(branch => {
      const branchQuests = quests.filter(q => q.branch === branch.id);
      const completedCount = branchQuests.filter(q => completed.has(q.id)).length;
      const questCount = branchQuests.length;

      // Branch is accessible if all prerequisite branches have at least one completed quest.
      const prereqsMet = branch.prerequisites.every(prereqId => {
        const prereqQuests = quests.filter(q => q.branch === prereqId);
        return prereqQuests.some(q => completed.has(q.id));
      });

      let status: BranchStatus;
      if (questCount > 0 && completedCount === questCount) {
        status = 'completed';
      } else if (prereqsMet || branch.prerequisites.length === 0) {
        status = completedCount > 0 ? 'in-progress' : 'available';
      } else {
        status = 'locked';
      }

      return { ...branch, status, questCount, completedCount };
    });
  });

  readonly row1 = computed(() => this.branches().filter(b => b.row === 1));
  readonly row2 = computed(() => this.branches().filter(b => b.row === 2).sort((a, b) => a.col - b.col));
  readonly row3 = computed(() => this.branches().filter(b => b.row === 3).sort((a, b) => a.col - b.col));
  readonly row4 = computed(() => this.branches().filter(b => b.row === 4));

  toggleExpanded(): void {
    this.expanded.update(v => !v);
  }

  selectBranch(branch: BranchViewModel): void {
    if (branch.status === 'locked') return;
    const current = this.selectedBranchId();
    // Toggle off if the same branch is clicked again.
    this.branchSelected.emit(current === branch.id ? null : branch.id);
  }

  tierIcon(tier: string): string {
    switch (tier) {
      case 'journeyman': return '\u26AA'; // ⚪
      case 'master': return '\uD83D\uDFE1'; // 🟡
      default: return '\uD83D\uDFEB'; // 🟫 (approximation)
    }
  }

  statusIcon(status: BranchStatus): string {
    switch (status) {
      case 'completed': return '\u2713';
      case 'in-progress': return '\u25B6';
      case 'locked': return '\uD83D\uDD12';
      default: return '\u25CB';
    }
  }
}
