import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
    docs: [
        'index',
        {
            type: 'category',
            label: 'Getting Started',
            items: ['getting-started/installation'],
        },
        {
            type: 'category',
            label: 'Guides',
            items: [
                'guides/basic-usage',
                'guides/advanced-composition',
                'guides/zod-integration',
                'guides/utility-generators',
            ],
        },
    ],
};

export default sidebars;
