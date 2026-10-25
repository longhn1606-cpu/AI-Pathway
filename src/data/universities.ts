import type { University } from '../types'

/**
 * Entirely simulated records for local/demo use.
 * Replace with source-checked records before presenting admissions facts as official.
 */
export const universities: University[] = [
  {
    id: 'demo-university-north',
    name: 'Trường đại học minh họa miền Bắc',
    shortName: 'ĐH Minh họa Bắc',
    province: 'Hà Nội (minh họa)',
    region: 'north',
    website: 'https://example.invalid/demo-university-north',
    sources: [{
      title: 'Nguồn mô phỏng AI Pathway - trường miền Bắc',
      url: 'https://example.invalid/sources/demo-university-north',
      applicableYear: 2026,
      checkedAt: '2026-10-24',
      status: 'simulated',
    }],
    status: 'simulated',
  },
  {
    id: 'demo-university-central',
    name: 'Trường đại học minh họa miền Trung',
    shortName: 'ĐH Minh họa Trung',
    province: 'Đà Nẵng (minh họa)',
    region: 'central',
    website: 'https://example.invalid/demo-university-central',
    sources: [{
      title: 'Nguồn mô phỏng AI Pathway - trường miền Trung',
      url: 'https://example.invalid/sources/demo-university-central',
      applicableYear: 2026,
      checkedAt: '2026-10-24',
      status: 'simulated',
    }],
    status: 'simulated',
  },
  {
    id: 'demo-university-south',
    name: 'Trường đại học minh họa miền Nam',
    shortName: 'ĐH Minh họa Nam',
    province: 'TP. Hồ Chí Minh (minh họa)',
    region: 'south',
    website: 'https://example.invalid/demo-university-south',
    sources: [{
      title: 'Nguồn mô phỏng AI Pathway - trường miền Nam',
      url: 'https://example.invalid/sources/demo-university-south',
      applicableYear: 2026,
      checkedAt: '2026-10-24',
      status: 'simulated',
    }],
    status: 'simulated',
  },
]
