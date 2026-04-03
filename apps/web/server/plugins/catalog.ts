import { pluginManifestSchema, type PluginManifest } from '@openstore/common';

const builtinPluginManifestsRaw: PluginManifest[] = [
  {
    slug: 'qmd-search',
    name: 'QMD Search',
    description:
      'Enhances native file discovery with query-aware re-ranking for document-heavy workspaces.',
    version: '0.1.0',
    developer: 'OpenStore Community',
    homepageUrl: 'https://github.com/tobi/qmd',
    source: 'community',
    permissions: ['files.read', 'search.read', 'search.enhance'],
    capabilities: ['workspace_search', 'file_actions'],
    actions: [
      {
        id: 'qmd.reindex-file',
        label: 'Refresh Discovery Index',
        description:
          'Re-index this file so future searches surface the newest content faster.',
        target: 'file',
        requiresPermissions: ['files.read', 'search.enhance'],
      },
    ],
    configFields: [
      {
        key: 'endpointUrl',
        label: 'QMD Endpoint URL',
        description:
          'Optional. URL of your hosted QMD service. If omitted, OpenStore uses built-in ranking.',
        type: 'url',
        required: false,
        placeholder: 'https://qmd.your-company.com',
      },
      {
        key: 'apiKey',
        label: 'QMD API Key',
        description:
          'Optional. Used only when your QMD deployment requires authenticated requests.',
        type: 'secret',
        required: false,
      },
    ],
  },
  {
    slug: 'google-drive-sync',
    name: 'Google Drive Sync',
    description:
      'Transfer files between OpenStore and Google Drive directly from file and folder workflows.',
    version: '0.1.0',
    developer: 'OpenStore',
    homepageUrl: 'https://dub.co/integrations',
    source: 'official',
    permissions: [
      'files.read',
      'files.write',
      'folders.read',
      'folders.write',
      'external.network',
      'external.google-drive',
    ],
    capabilities: ['file_actions', 'folder_actions', 'import_export'],
    actions: [
      {
        id: 'google-drive.export-file',
        label: 'Export To Drive',
        description:
          'Send this file to your connected Google Drive destination.',
        target: 'file',
        requiresPermissions: ['files.read', 'external.google-drive'],
      },
      {
        id: 'google-drive.import-into-folder',
        label: 'Import From Drive',
        description:
          'Import files from Google Drive directly into this folder.',
        target: 'folder',
        requiresPermissions: ['files.write', 'external.google-drive'],
      },
    ],
    configFields: [
      {
        key: 'clientId',
        label: 'Google OAuth Client ID',
        type: 'text',
        required: true,
      },
      {
        key: 'clientSecret',
        label: 'Google OAuth Client Secret',
        type: 'secret',
        required: true,
      },
      {
        key: 'refreshToken',
        label: 'Google Refresh Token',
        type: 'secret',
        required: true,
      },
      {
        key: 'defaultDestinationFolderId',
        label: 'Default Drive Folder ID',
        description:
          'Optional. Destination folder used when exporting without a specific Drive target.',
        type: 'text',
        required: false,
      },
    ],
  },
];

const builtinPluginManifests = builtinPluginManifestsRaw.map((manifest) =>
  pluginManifestSchema.parse(manifest),
);

export function getBuiltinPluginCatalog(): PluginManifest[] {
  return builtinPluginManifests.map((manifest) => ({ ...manifest }));
}

export function getBuiltinPluginBySlug(slug: string): PluginManifest | null {
  const found = builtinPluginManifests.find((manifest) => manifest.slug === slug);
  return found ? { ...found } : null;
}
