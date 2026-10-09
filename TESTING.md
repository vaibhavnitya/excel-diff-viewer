## Manual smoke tests

### Hooks + Worker in Next.js
Before releasing or after major changes to core/worker:

1. Create a page in apps/demo using useExcelFile with a file input
2. npm run dev, upload a real xlsx
3. Verify state transitions idle → loading → success
4. Upload an unsupported file, verify error state fires
5. Delete the page after verifying

This path is not covered by unit tests (which mock the Worker) and 
requires manual verification in a real browser-bundler environment.