import fs from 'fs';

const file = 'src/routeTree.gen.ts';
let content = fs.readFileSync(file, 'utf8');

// The issue is that DashboardFinanceAlbumeviRoute is not added to any children array.
// And its parent should be DashboardRoute to render properly, or we can just add it to DashboardRouteChildren.
// Let's modify the routeTree to make it a child of DashboardRoute.

content = content.replace(
  `getParentRoute: () => DashboardFinanceRoute`,
  `getParentRoute: () => DashboardRoute`
);

content = content.replace(
  `parentRoute: typeof DashboardFinanceRoute`,
  `parentRoute: typeof DashboardRoute`
);

// Add to DashboardRouteChildren interface
if (!content.includes('DashboardFinanceAlbumeviRoute: typeof DashboardFinanceAlbumeviRoute')) {
  content = content.replace(
    `interface DashboardRouteChildren {`,
    `interface DashboardRouteChildren {\n  DashboardFinanceAlbumeviRoute: typeof DashboardFinanceAlbumeviRoute`
  );
}

// Add to DashboardRouteChildren object
if (!content.includes('DashboardFinanceAlbumeviRoute: DashboardFinanceAlbumeviRoute')) {
  content = content.replace(
    `const DashboardRouteChildren: DashboardRouteChildren = {`,
    `const DashboardRouteChildren: DashboardRouteChildren = {\n  DashboardFinanceAlbumeviRoute: DashboardFinanceAlbumeviRoute,`
  );
}

// Also fix the path in FileRoutesByPath for albumevi
// It should be /finance/albumevi relative to /dashboard
content = content.replace(
  `      path: '/albumevi'\n      fullPath: '/dashboard/finance/albumevi'`,
  `      path: '/finance/albumevi'\n      fullPath: '/dashboard/finance/albumevi'`
);

// And in the update config:
content = content.replace(
  `id: '/albumevi',\n  path: '/albumevi',`,
  `id: '/finance/albumevi',\n  path: '/finance/albumevi',`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed routeTree.gen.ts');
