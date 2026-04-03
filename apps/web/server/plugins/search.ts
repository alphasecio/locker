import { and, eq } from 'drizzle-orm';
import { workspacePlugins } from '@openstore/database';
import type { PluginPermission } from '@openstore/common';
import type { Database } from '@openstore/database/client';

function hasPermission(
  grantedPermissions: PluginPermission[] | unknown,
  requiredPermission: PluginPermission,
): boolean {
  if (!Array.isArray(grantedPermissions)) {
    return false;
  }
  return grantedPermissions.includes(requiredPermission);
}

function scoreByQuery(name: string, query: string, tokens: string[]): number {
  const normalizedName = name.toLowerCase();
  let score = 0;

  if (normalizedName === query) score += 80;
  if (normalizedName.startsWith(query)) score += 35;
  if (normalizedName.includes(query)) score += 15;

  for (const token of tokens) {
    if (token.length >= 2 && normalizedName.includes(token)) {
      score += 7;
    }
  }

  // Slightly favor document types that tend to be knowledge-heavy.
  if (
    normalizedName.endsWith('.pdf') ||
    normalizedName.endsWith('.md') ||
    normalizedName.endsWith('.doc') ||
    normalizedName.endsWith('.docx') ||
    normalizedName.endsWith('.txt')
  ) {
    score += 4;
  }

  return score;
}

export async function enhanceSearchResultsWithPlugins<T extends {
  name: string;
  updatedAt: Date;
}>(params: {
  db: Database;
  workspaceId: string;
  query: string;
  results: T[];
}): Promise<T[]> {
  const query = params.query.trim().toLowerCase();
  if (!query || params.results.length <= 1) {
    return params.results;
  }

  const [qmdPlugin] = await params.db
    .select({
      grantedPermissions: workspacePlugins.grantedPermissions,
      status: workspacePlugins.status,
    })
    .from(workspacePlugins)
    .where(
      and(
        eq(workspacePlugins.workspaceId, params.workspaceId),
        eq(workspacePlugins.pluginSlug, 'qmd-search'),
        eq(workspacePlugins.status, 'active'),
      ),
    )
    .limit(1);

  if (!qmdPlugin) {
    return params.results;
  }

  if (!hasPermission(qmdPlugin.grantedPermissions, 'search.enhance')) {
    return params.results;
  }

  const tokens = query.split(/\s+/).filter(Boolean);
  return [...params.results].sort((left, right) => {
    const scoreDiff =
      scoreByQuery(right.name, query, tokens) -
      scoreByQuery(left.name, query, tokens);

    if (scoreDiff !== 0) {
      return scoreDiff;
    }

    return right.updatedAt.getTime() - left.updatedAt.getTime();
  });
}
