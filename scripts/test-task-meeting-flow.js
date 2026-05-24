#!/usr/bin/env node
/**
 * Test: جریان تسک/جلسه با projectId عددی + projectName
 * باید projectId به UUID واقعی resolve شود و خطای "projectId باید UUID باشد" ندهد.
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(s) {
  return s != null && typeof s === 'string' && UUID_REGEX.test(s.trim());
}

// شبیه‌سازی PlannerContext addTask
function resolveProjectId(input, projects) {
  let projectId = input.projectId != null ? String(input.projectId) : null;
  if (input.projectName && (!projectId || !UUID_REGEX.test(projectId.trim()))) {
    const found = projects.find(
      (p) => p.name && input.projectName && p.name.toLowerCase().includes(input.projectName.toLowerCase())
    );
    if (found) projectId = found.id;
  }
  if (projectId && !UUID_REGEX.test(String(projectId).trim())) projectId = null;
  return projectId;
}

const projects = [
  { id: '29f8c98e-12f2-4821-bc87-84a273ce7c76', name: 'تهران مدیکس' },
  { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', name: 'پروژه دیگر' },
];

const tests = [
  {
    name: 'projectId عدد 29 + projectName تهران مدیکس → UUID پروژه',
    input: { projectId: 29, projectName: 'تهران مدیکس' },
    expect: '29f8c98e-12f2-4821-bc87-84a273ce7c76',
  },
  {
    name: 'projectId رشته "29" + projectName تهران مدیکس → UUID',
    input: { projectId: '29', projectName: 'تهران مدیکس' },
    expect: '29f8c98e-12f2-4821-bc87-84a273ce7c76',
  },
  {
    name: 'فقط projectName (بدون projectId) → UUID',
    input: { projectName: 'تهران مدیکس' },
    expect: '29f8c98e-12f2-4821-bc87-84a273ce7c76',
  },
  {
    name: 'projectId UUID معتبر → همان UUID',
    input: { projectId: '29f8c98e-12f2-4821-bc87-84a273ce7c76', projectName: 'تهران مدیکس' },
    expect: '29f8c98e-12f2-4821-bc87-84a273ce7c76',
  },
  {
    name: 'projectId نامعتبر بدون projectName → null',
    input: { projectId: 29 },
    expect: null,
  },
];

let passed = 0;
let failed = 0;

for (const t of tests) {
  const got = resolveProjectId(t.input, projects);
  const ok = got === t.expect;
  if (ok) {
    passed++;
    console.log('✓', t.name);
  } else {
    failed++;
    console.log('✗', t.name, '→ expected', t.expect, 'got', got);
  }
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
